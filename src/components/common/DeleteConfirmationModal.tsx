import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  onClose: () => void;
  onConfirm: (isHardDelete: boolean) => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Choose how you want to delete this record.',
  itemName = 'this item',
  onClose,
  onConfirm
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-gray-600">
          <p>{message}</p>
          <p className="font-medium text-gray-800">Item: {itemName}</p>
          
          <div className="space-y-3 mt-4">
            <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => onConfirm(false)}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-blue-700 mb-1">Soft Delete</h4>
                  <p className="text-sm text-gray-500">Moves the record to the trash. It can be restored later and keeps historical records intact.</p>
                </div>
              </div>
            </div>

            <div className="p-3 border border-red-200 rounded-lg hover:border-red-400 hover:bg-red-50 cursor-pointer transition-colors" onClick={() => onConfirm(true)}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-red-700 mb-1 flex items-center gap-1"><Trash2 size={14}/> Hard Delete</h4>
                  <p className="text-sm text-gray-500">Permanently removes the record and all associated files/data from the database. This action cannot be undone.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
