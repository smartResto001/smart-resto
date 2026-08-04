import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Table } from '../../types';
import { QrCode, Download, Printer, RefreshCw, X, Check, Copy, AlertCircle } from 'lucide-react';
import API from '../../services/api';

interface QrManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  hotelName?: string;
  onRefreshTables: () => void;
}

export const QrManagementModal: React.FC<QrManagementModalProps> = ({
  isOpen,
  onClose,
  tables,
  hotelName = 'SmartResto',
  onRefreshTables,
}) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(tables[0] || null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;

  const getTableQrUrl = (table: Table) => {
    const token = table.qrToken || 'default-token';
    return `${currentOrigin}/table/${table.tableNumber}/${token}`;
  };

  const handleRegenerateToken = async (tableId: string) => {
    try {
      setIsRegenerating(true);
      const res = await API.post(`/tables/${tableId}/regenerate-qr`);
      if (res.data.success) {
        onRefreshTables();
        if (selectedTable?.id === tableId) {
          setSelectedTable(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate QR token', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyLink = (table: Table) => {
    const url = getTableQrUrl(table);
    navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSVG = (table: Table) => {
    const svgElement = document.getElementById(`qr-svg-${table.id}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `Table-${table.tableNumber}-QR.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrintCard = (table: Table) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrUrl = getTableQrUrl(table);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${table.tableNumber} - QR Code</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8fafc;
            }
            .qr-card {
              border: 3px solid #0284c7;
              border-radius: 24px;
              padding: 40px;
              text-align: center;
              background: #ffffff;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              max-width: 360px;
              width: 100%;
            }
            .hotel-title {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .table-badge {
              display: inline-block;
              background: #0284c7;
              color: white;
              font-size: 20px;
              font-weight: 700;
              padding: 6px 24px;
              border-radius: 9999px;
              margin: 12px 0 24px 0;
            }
            .qr-container {
              background: #ffffff;
              padding: 16px;
              border-radius: 16px;
              display: inline-block;
              border: 1px solid #e2e8f0;
            }
            .scan-instructions {
              font-size: 16px;
              font-weight: 600;
              color: #334155;
              margin-top: 24px;
            }
            .scan-subtext {
              font-size: 13px;
              color: #64748b;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="hotel-title">${hotelName}</div>
            <div class="table-badge">TABLE ${table.tableNumber}</div>
            <div class="qr-container">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}" width="220" height="220" alt="QR Code" />
            </div>
            <div class="scan-instructions">📲 SCAN TO ORDER</div>
            <div class="scan-subtext">Open your phone camera & scan to view digital menu & order</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const activeTable = selectedTable || tables[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">QR Code Management</h2>
              <p className="text-xs text-slate-400">Generate, print, and manage unique table QR ordering codes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Table List Sidebar */}
          <div className="md:col-span-5 p-4 space-y-2 bg-slate-900/60 overflow-y-auto max-h-[400px] md:max-h-full">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">
              Select Restaurant Table ({tables.length})
            </h3>
            {tables.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 bg-slate-800/40 rounded-xl">
                No tables available. Add tables from the Tables tab.
              </div>
            ) : (
              tables.map((tbl) => {
                const isSelected = activeTable?.id === tbl.id;
                return (
                  <button
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg shadow-sky-500/5'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {tbl.tableNumber}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Table {tbl.tableNumber}</div>
                        <div className="text-xs text-slate-400">Capacity: {tbl.capacity} seats</div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        tbl.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {tbl.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* QR Preview & Actions Panel */}
          {activeTable ? (
            <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-6">
              {/* Preview Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      Selected Table
                    </span>
                    <h3 className="text-2xl font-extrabold text-white">Table {activeTable.tableNumber} QR Code</h3>
                  </div>
                  <button
                    onClick={() => handleRegenerateToken(activeTable.id)}
                    disabled={isRegenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Regenerate Security Token
                  </button>
                </div>

                {/* Printable Card Mockup */}
                <div className="bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-sky-500/30 rounded-2xl p-6 text-center shadow-xl max-w-sm mx-auto my-2 relative overflow-hidden group">
                  <div className="text-sm font-bold tracking-widest uppercase text-sky-400 mb-1">
                    {hotelName}
                  </div>
                  <div className="inline-block bg-sky-600 text-white font-extrabold text-sm px-4 py-1 rounded-full my-2 shadow">
                    TABLE {activeTable.tableNumber}
                  </div>

                  {/* QR Code Canvas/SVG */}
                  <div className="bg-white p-4 rounded-xl inline-block my-3 shadow-md border border-slate-200">
                    <QRCodeSVG
                      id={`qr-svg-${activeTable.id}`}
                      value={getTableQrUrl(activeTable)}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-white font-bold text-sm tracking-wide mt-2">
                    📲 SCAN TO ORDER MENU
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Point camera at QR code to order digital menu & track status
                  </div>
                </div>

                {/* Direct Link Info */}
                <div className="mt-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-2">
                  <div className="truncate text-slate-400 font-mono">
                    {getTableQrUrl(activeTable)}
                  </div>
                  <button
                    onClick={() => handleCopyLink(activeTable)}
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 shrink-0 font-medium"
                  >
                    {copiedId === activeTable.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handlePrintCard(activeTable)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 transition text-sm"
                >
                  <Printer className="w-4 h-4" /> Print QR Card
                </button>
                <button
                  onClick={() => handleDownloadSVG(activeTable)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition text-sm"
                >
                  <Download className="w-4 h-4" /> Download SVG
                </button>
              </div>
            </div>
          ) : (
            <div className="md:col-span-7 p-6 flex items-center justify-center text-slate-500">
              Select a table to view and download QR Code
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
