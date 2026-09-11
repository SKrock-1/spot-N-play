import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

export default function PoolQr({ payload, ticketId, checkedIn, isExpired }) {
  if (checkedIn) {
    return (
      <div className="text-center py-6">
        <span className="text-4xl">✅</span>
        <p className="text-green-400 font-bold mt-2">Checked in</p>
        <p className="text-gray-500 text-xs mt-1">Ticket {ticketId} already used — one scan only</p>
      </div>
    );
  }
  if (isExpired) {
    return (
      <div className="text-center py-6">
        <span className="text-4xl">⌛</span>
        <p className="text-gray-500 font-semibold mt-2">QR expired</p>
        <p className="text-gray-600 text-xs">Valid till slot end</p>
      </div>
    );
  }
  if (!payload) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-2xl">
        <QRCode value={payload} size={180} />
      </div>
      <p className="text-[11px] text-gray-500 font-mono tracking-widest">{ticketId}</p>
      <p className="text-[11px] text-gray-600">Show at gate — one scan only. Screenshot sharing blocked.</p>
    </div>
  );
}
