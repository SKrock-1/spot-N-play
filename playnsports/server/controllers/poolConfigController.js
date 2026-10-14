import asyncHandler from 'express-async-handler';
import Ground from '../models/Ground.js';
import { getOrCreateConfig } from '../utils/poolBookingEngine.js';

// Admins get exactly the same access as the venue's own owner here — the
// route only checks role (pool_owner or admin), and this is the check that
// decides whether *this particular* venue is theirs to manage. An admin
// always passes; a pool_owner only passes for venues they own.
const loadPoolGround = async (groundId, user) => {
  const ground = await Ground.findById(groundId);
  if (!ground || ground.venueType !== 'pool') {
    return { error: { status: 404, message: 'Pool venue not found' } };
  }
  const isOwner = String(ground.owner) === String(user._id);
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { error: { status: 403, message: 'Not authorized for this venue' } };
  }
  return { ground };
};

const findPool = (config, poolId) => config.pools.id(poolId);

// Slot editing (weekly template or a date override) is only meaningful once
// the venue is actually live and approved — same gate the ground/gym slot
// system uses, so an owner can't configure bookable hours for a venue
// players can't yet reach.
const ensureEditable = (ground, res) => {
  if (ground.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Cannot edit slots — venue is not yet approved by admin');
  }
  if (ground.venueMode !== 'live') {
    res.status(403);
    throw new Error('This venue is still in its trial phase — slot scheduling opens once it goes live');
  }
};

// ── Config ────────────────────────────────────────────────────────────

const getPoolConfig = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  res.json(config);
});

// ── Pools (physical pools at the venue) ─────────────────────────────────

const addPool = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const { name, defaultCapacity } = req.body;
  if (!name?.trim()) { res.status(400); throw new Error('Pool name is required'); }

  const config = await getOrCreateConfig(ground._id);
  config.pools.push({
    name: name.trim(),
    defaultCapacity: defaultCapacity ? Number(defaultCapacity) : 20,
  });
  await config.save();
  res.status(201).json(config);
});

const updatePool = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const { name, isActive, defaultCapacity } = req.body;
  if (name !== undefined && name.trim()) pool.name = name.trim();
  if (isActive !== undefined) pool.isActive = !!isActive;
  if (defaultCapacity !== undefined && Number(defaultCapacity) > 0) pool.defaultCapacity = Number(defaultCapacity);

  await config.save();
  res.json(config);
});

const removePool = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  if (config.pools.length <= 1) {
    res.status(400);
    throw new Error('A venue needs at least one pool — add another before removing this one');
  }
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  config.pools = config.pools.filter((p) => String(p._id) !== req.params.poolId);
  await config.save();
  res.json(config);
});

// ── Weekly (recurring) template ─────────────────────────────────────────

const addWeeklyBlock = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const { dayOfWeek, startTime, endTime, capacity, category } = req.body;
  if (dayOfWeek === undefined || !startTime || !endTime) {
    res.status(400);
    throw new Error('dayOfWeek, startTime and endTime are required');
  }
  if (category && !['general', 'girls_only'].includes(category)) {
    res.status(400); throw new Error('Invalid category');
  }

  const alreadyExists = pool.weeklyBlocks.some(
    (b) => b.dayOfWeek === Number(dayOfWeek) && b.startTime === startTime
  );
  if (alreadyExists) {
    res.status(400);
    throw new Error('A slot already exists at that time');
  }

  pool.weeklyBlocks.push({
    dayOfWeek: Number(dayOfWeek),
    startTime,
    endTime,
    capacity: capacity ? Number(capacity) : pool.defaultCapacity,
    category: category || 'general',
  });
  await config.save();
  res.status(201).json(config);
});

const updateWeeklyBlock = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const block = pool.weeklyBlocks.id(req.params.blockId);
  if (!block) { res.status(404); throw new Error('Slot not found'); }

  const { capacity, category } = req.body;
  if (!capacity || Number(capacity) < 1) { res.status(400); throw new Error('A valid capacity is required'); }
  if (category && !['general', 'girls_only'].includes(category)) { res.status(400); throw new Error('Invalid category'); }
  block.capacity = Number(capacity);
  if (category) block.category = category;

  await config.save();
  res.json(config);
});

const removeWeeklyBlock = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  pool.weeklyBlocks = pool.weeklyBlocks.filter((b) => String(b._id) !== req.params.blockId);
  await config.save();
  res.json(config);
});

// ── Per-date overrides (exceptions to the recurring pattern) ───────────

// Switches one specific date into "custom" mode by seeding it with that
// date's currently-effective weekly blocks, so the owner edits from a
// sensible starting point instead of a blank grid. Calling this again on an
// already-custom date is a no-op (never re-seeds over edits already made).
const startOverrideDay = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const { date } = req.params;
  if (!pool.overrideDates.includes(date)) {
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const seedBlocks = pool.weeklyBlocks
      .filter((b) => b.dayOfWeek === dayOfWeek)
      .map((b) => ({ date, startTime: b.startTime, endTime: b.endTime, capacity: b.capacity, category: b.category }));

    pool.overrideDates.push(date);
    pool.overrideBlocks.push(...seedBlocks);
    await config.save();
  }

  res.json(config);
});

// Reverts a date back to following the recurring weekly pattern.
const revertOverrideDay = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const { date } = req.params;
  pool.overrideDates = pool.overrideDates.filter((d) => d !== date);
  pool.overrideBlocks = pool.overrideBlocks.filter((b) => b.date !== date);
  await config.save();
  res.json(config);
});

const addOverrideBlock = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const { date } = req.params;
  if (!pool.overrideDates.includes(date)) {
    res.status(400);
    throw new Error('Start a custom schedule for this date first');
  }

  const { startTime, endTime, capacity, category } = req.body;
  if (!startTime || !endTime) { res.status(400); throw new Error('startTime and endTime are required'); }
  if (category && !['general', 'girls_only'].includes(category)) { res.status(400); throw new Error('Invalid category'); }

  const alreadyExists = pool.overrideBlocks.some((b) => b.date === date && b.startTime === startTime);
  if (alreadyExists) { res.status(400); throw new Error('A slot already exists at that time'); }

  pool.overrideBlocks.push({
    date,
    startTime,
    endTime,
    capacity: capacity ? Number(capacity) : pool.defaultCapacity,
    category: category || 'general',
  });
  await config.save();
  res.status(201).json(config);
});

const updateOverrideBlock = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  const block = pool.overrideBlocks.id(req.params.blockId);
  if (!block) { res.status(404); throw new Error('Slot not found'); }

  const { capacity, category } = req.body;
  if (!capacity || Number(capacity) < 1) { res.status(400); throw new Error('A valid capacity is required'); }
  if (category && !['general', 'girls_only'].includes(category)) { res.status(400); throw new Error('Invalid category'); }
  block.capacity = Number(capacity);
  if (category) block.category = category;

  await config.save();
  res.json(config);
});

const removeOverrideBlock = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }
  ensureEditable(ground, res);

  const config = await getOrCreateConfig(ground._id);
  const pool = findPool(config, req.params.poolId);
  if (!pool) { res.status(404); throw new Error('Pool not found on this venue'); }

  pool.overrideBlocks = pool.overrideBlocks.filter((b) => String(b._id) !== req.params.blockId);
  await config.save();
  res.json(config);
});

// ── Plan types (HOW you pay/access — Single Session, Monthly, etc.) ─────

const addPlanType = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const { name, billingLabel } = req.body;
  if (!name?.trim()) { res.status(400); throw new Error('A plan type name is required'); }

  const config = await getOrCreateConfig(ground._id);
  config.planTypes.push({
    name: name.trim(),
    billingLabel: billingLabel?.trim() || 'per session',
  });
  await config.save();
  res.status(201).json(config);
});

const updatePlanType = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  const planType = config.planTypes.id(req.params.planTypeId);
  if (!planType) { res.status(404); throw new Error('Plan type not found'); }

  const { name, billingLabel, isActive } = req.body;
  if (name !== undefined && name.trim()) planType.name = name.trim();
  if (billingLabel !== undefined && billingLabel.trim()) planType.billingLabel = billingLabel.trim();
  if (isActive !== undefined) planType.isActive = !!isActive;

  await config.save();
  res.json(config);
});

const removePlanType = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  config.planTypes = config.planTypes.filter((p) => String(p._id) !== req.params.planTypeId);
  await config.save();
  res.json(config);
});

// ── Categories (WHO you are, within one plan type) ──────────────────────

const addCategory = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  const planType = config.planTypes.id(req.params.planTypeId);
  if (!planType) { res.status(404); throw new Error('Plan type not found'); }

  const { name, price } = req.body;
  if (!name?.trim() || price === undefined || Number(price) < 0) {
    res.status(400); throw new Error('A category name and a valid price are required');
  }

  planType.categories.push({ name: name.trim(), price: Number(price) });
  await config.save();
  res.status(201).json(config);
});

const updateCategory = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  const planType = config.planTypes.id(req.params.planTypeId);
  if (!planType) { res.status(404); throw new Error('Plan type not found'); }
  const category = planType.categories.id(req.params.categoryId);
  if (!category) { res.status(404); throw new Error('Category not found'); }

  const { name, price, isActive } = req.body;
  if (name !== undefined && name.trim()) category.name = name.trim();
  if (price !== undefined && Number(price) >= 0) category.price = Number(price);
  if (isActive !== undefined) category.isActive = !!isActive;

  await config.save();
  res.json(config);
});

const removeCategory = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  const planType = config.planTypes.id(req.params.planTypeId);
  if (!planType) { res.status(404); throw new Error('Plan type not found'); }
  planType.categories = planType.categories.filter((c) => String(c._id) !== req.params.categoryId);
  await config.save();
  res.json(config);
});

// registrationFee (one-time) and coachingFee (displayed only — coaching
// enrollment is "coming soon") — both venue-level, both owner/admin editable.
const updateVenueFees = asyncHandler(async (req, res) => {
  const { ground, error } = await loadPoolGround(req.params.groundId, req.user);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  const { registrationFee, coachingFee } = req.body;
  if (registrationFee !== undefined && Number(registrationFee) >= 0) config.registrationFee = Number(registrationFee);
  if (coachingFee !== undefined && Number(coachingFee) >= 0) config.coachingFee = Number(coachingFee);

  await config.save();
  res.json(config);
});

export {
  getPoolConfig,
  addPool, updatePool, removePool,
  addWeeklyBlock, updateWeeklyBlock, removeWeeklyBlock,
  startOverrideDay, revertOverrideDay,
  addOverrideBlock, updateOverrideBlock, removeOverrideBlock,
  addPlanType, updatePlanType, removePlanType,
  addCategory, updateCategory, removeCategory,
  updateVenueFees,
};
