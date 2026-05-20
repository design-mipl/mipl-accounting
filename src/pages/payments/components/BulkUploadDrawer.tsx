import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Download, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import { usePayments } from '../../../contexts/PaymentContext';
import { useVendors } from '../../../contexts/VendorContext';
import { useEmployees } from '../../../contexts/EmployeeContext';
import { Payment } from '../../../types/payment';

interface BulkUploadDrawerProps {
  open: boolean;
  onClose: () => void;
}

type ParsedRow = {
  isValid: boolean;
  errors: string[];
  data: Partial<Payment>;
  raw: any;
};

export default function BulkUploadDrawer({ open, onClose }: BulkUploadDrawerProps) {
  const { bulkAddPayments } = usePayments();
  const { vendors } = useVendors();
  const { employees } = useEmployees();

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setParsedRows([]);
      setError(null);
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const downloadTemplate = () => {
    const headers = ["Expense Date (YYYY-MM-DD)", "Expense Type", "Party Type", "Party Name", "Base Amount", "GST Applicable (Yes/No)", "GST Percentage", "Deduction Type", "Deduction Value", "Paid Amount", "Notes"];
    
    const today = new Date().toISOString().split('T')[0];
    
    // Generate rows dynamically from current vendors
    const vendorRows = vendors.map(v => {
      const name = v.companyName ? `${v.companyName} (${v.name})` : v.name;
      const hasGst = v.gstApplicable ? "Yes" : "No";
      const dedType = v.tdsApplicable ? "TDS" : "None";
      const dedVal = v.tdsApplicable ? (v.tdsPercentage || "10") : "";
      return [today, "Other", "Vendor", name, "", hasGst, "", dedType, dedVal, "", ""];
    });

    // Generate rows dynamically from current employees
    const employeeRows = employees.map(e => {
      return [today, "Salary", "Employee", e.name, "", "No", "", "None", "", "", "Monthly Salary"];
    });

    const ws_data = [
      headers,
      ...vendorRows,
      ...employeeRows,
    ];

    // If no vendors or employees exist, provide a fallback example
    if (ws_data.length === 1) {
      ws_data.push(["2026-05-01", "Rent", "Vendor", "Office Space Inc", "15000", "Yes", "18", "TDS", "10", "15000", "Monthly office rent"]);
      ws_data.push(["2026-05-05", "Salary", "Employee", "John Doe", "45000", "No", "", "PT", "200", "44800", "May Salary"]);
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Recurring_Payments_Template.xlsx");
  };

  const processFile = async (file: File) => {
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
      
      const filteredJson = json.filter(row => {
        const partyName = row["Party Name"]?.toString().trim();
        return partyName && partyName !== "";
      });

      if (filteredJson.length === 0) {
        throw new Error("No rows found with a valid Party Name. Please ensure your Excel file contains valid data.");
      }

      const rows: ParsedRow[] = filteredJson.map((row, index) => {
        const errors: string[] = [];
        const payment: Partial<Payment> = { recurring: true };

        // Expense Date
        const dateRaw = row["Expense Date (YYYY-MM-DD)"];
        if (!dateRaw) errors.push("Missing Expense Date");
        else {
          let dateStr = String(dateRaw).trim();
          if (!isNaN(Number(dateRaw)) && dateRaw > 20000) {
             const jsDate = new Date(Math.round((dateRaw - 25569)*86400*1000));
             dateStr = jsDate.toISOString().split('T')[0];
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) errors.push("Invalid date format (must be YYYY-MM-DD)");
          payment.expenseDate = dateStr;
        }

        // Expense Type
        const expenseType = row["Expense Type"]?.toString().trim();
        if (!expenseType) errors.push("Missing Expense Type");
        payment.expenseType = expenseType;

        // Party Type
        const partyTypeStr = row["Party Type"]?.toString().trim().toLowerCase();
        if (!partyTypeStr) {
          errors.push("Missing Party Type");
        } else if (partyTypeStr === "vendor") {
          payment.partyType = "Vendor";
        } else if (partyTypeStr === "employee") {
          payment.partyType = "Employee";
        } else if (partyTypeStr === "other" || partyTypeStr === "household") {
          payment.partyType = partyTypeStr === "household" ? "Household" : "Other";
        } else {
          errors.push(`Invalid Party Type: ${partyTypeStr}`);
        }

        // Party Name matching
        const partyName = row["Party Name"]?.toString().trim();
        if (!partyName) {
          errors.push("Missing Party Name");
        } else {
          payment.partyName = partyName;
          if (payment.partyType === "Vendor") {
            const match = vendors.find(v => {
              const expectedName = v.companyName ? `${v.companyName} (${v.name})` : v.name;
              return expectedName.toLowerCase() === partyName.toLowerCase() || 
                     (v.companyName?.toLowerCase() === partyName.toLowerCase()) || 
                     v.name.toLowerCase() === partyName.toLowerCase();
            });
            if (match) {
              payment.vendorId = match.id;
              payment.partyName = match.companyName ? `${match.companyName} (${match.name})` : match.name;
            } else {
              errors.push(`Vendor "${partyName}" not found in system.`);
            }
          } else if (payment.partyType === "Employee") {
            const match = employees.find(e => e.name.toLowerCase() === partyName.toLowerCase());
            if (match) {
              payment.employeeId = match.id;
              payment.partyName = match.name;
            } else {
              errors.push(`Employee "${partyName}" not found in system.`);
            }
          }
        }

        // Base Amount (Non-mandatory for recurring)
        const baseAmtStr = row["Base Amount"]?.toString().trim();
        const baseAmt = baseAmtStr ? parseFloat(baseAmtStr) : 0;
        if (baseAmt < 0) errors.push("Base Amount cannot be negative");
        payment.baseAmount = isNaN(baseAmt) ? 0 : baseAmt;

        // GST
        const gstAppStr = row["GST Applicable (Yes/No)"]?.toString().trim().toLowerCase();
        if (gstAppStr === "yes" || gstAppStr === "true" || gstAppStr === "y") {
          payment.gstApplicable = true;
          const gstPercStr = row["GST Percentage"]?.toString().trim();
          const gstPerc = gstPercStr ? parseFloat(gstPercStr) : 0;
          if (gstPerc < 0 || gstPerc > 100) errors.push("Invalid GST Percentage");
          payment.gstPercent = isNaN(gstPerc) ? 0 : gstPerc;
        } else {
          payment.gstApplicable = false;
        }

        // Deduction
        const dedTypeStr = row["Deduction Type"]?.toString().trim().toUpperCase() || "NONE";
        if (dedTypeStr === "TDS" || dedTypeStr === "PT" || dedTypeStr === "OTHER") {
          payment.deductionType = dedTypeStr === "OTHER" ? "Other" : (dedTypeStr as any);
          const dedValStr = row["Deduction Value"]?.toString().trim();
          const dedVal = dedValStr ? parseFloat(dedValStr) : 0;
          if (dedVal < 0) errors.push("Invalid Deduction Value");
          payment.deductionPercent = isNaN(dedVal) ? 0 : dedVal;
        } else {
          payment.deductionType = "None";
        }

        // Paid amount
        const paidAmtStr = row["Paid Amount"]?.toString().trim();
        const paidAmt = paidAmtStr ? parseFloat(paidAmtStr) : 0;
        payment.paidAmount = isNaN(paidAmt) ? 0 : Math.max(0, paidAmt);

        // Notes
        payment.notes = row["Notes"]?.toString() || "";

        return {
          isValid: errors.length === 0,
          errors,
          data: payment,
          raw: row,
        };
      });

      setParsedRows(rows);
    } catch (err: any) {
      setError(err.message || "Failed to parse Excel file. Please ensure it matches the template format.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError("No valid rows to upload.");
      return;
    }

    try {
      setSaving(true);
      await bulkAddPayments(validRows.map(r => r.data));
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during bulk upload');
    } finally {
      setSaving(false);
    }
  };

  const hasErrors = parsedRows.some(r => !r.isValid);
  const totalValid = parsedRows.filter(r => r.isValid).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col transition-transform">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Bulk Upload Recurring Payments</h2>
              <p className="text-sm text-gray-500">Import multiple recurring payments via Excel or CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {!parsedRows.length ? (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h3>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1.5 ml-1">
                  <li>Download the exact template using the button below.</li>
                  <li>Do not change the header column names.</li>
                  <li>Ensure Party Names match exactly with existing Vendors or Employees if applicable.</li>
                  <li>Save the file as .xlsx or .csv and drop it here.</li>
                </ol>
                <button
                  onClick={downloadTemplate}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg shadow-sm border border-blue-200 hover:bg-blue-50 transition-colors text-sm"
                >
                  <Download size={16} />
                  Download Excel Template
                </button>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200",
                  isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50"
                )}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && processFile(e.target.files[0])}
                />
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  <Upload size={28} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Drop your file here</h3>
                <p className="text-sm text-gray-500 mt-2">or click to browse from your computer</p>
                <p className="text-xs text-gray-400 mt-4">Supported formats: .xlsx, .xls, .csv</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  {hasErrors ? <AlertCircle className="text-amber-500" size={20} /> : <CheckCircle2 className="text-emerald-500" size={20} />}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {totalValid} of {parsedRows.length} rows valid
                    </h3>
                    <p className="text-sm text-gray-500">
                      {hasErrors ? 'Please fix the errors below and re-upload' : 'Ready to import'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setParsedRows([]); setError(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  Clear & Upload Another
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 outline outline-1 outline-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Party</th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-right">Base Amt</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map((row, i) => (
                        <tr key={i} className={clsx(!row.isValid ? 'bg-red-50/50' : 'hover:bg-gray-50')}>
                          <td className="px-4 py-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">Valid</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium">Invalid</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{row.data.expenseDate || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.data.partyName || '-'}</div>
                            <div className="text-xs text-gray-500">{row.data.partyType || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">
                            ₹{row.data.baseAmount?.toLocaleString() || '0'}
                          </td>
                          <td className="px-4 py-3">
                            {row.errors.length > 0 ? (
                              <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                                {row.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                              </ul>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !parsedRows.length || hasErrors}
            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              'Import Valid Rows'
            )}
          </button>
        </div>

      </div>
    </>
  );
}
