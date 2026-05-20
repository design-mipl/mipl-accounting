import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Download, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import { useVendors } from '../../../contexts/VendorContext';
import { Vendor } from '../../../types/vendor';

interface BulkUploadVendorDrawerProps {
  open: boolean;
  onClose: () => void;
}

type ParsedRow = {
  isValid: boolean;
  errors: string[];
  data: Partial<Vendor>;
  raw: any;
};

export default function BulkUploadVendorDrawer({ open, onClose }: BulkUploadVendorDrawerProps) {
  const { bulkAddVendors } = useVendors();

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
    const headers = [
      "Vendor Type * (Individual/Company)",
      "Company Name (Required for Company)",
      "Vendor Name *",
      "Phone Number *",
      "Email *",
      "CC Emails (Comma separated)",
      "Status (Active/Inactive)",
      "GST Applicable (Yes/No)",
      "GSTIN Number",
      "Verified GSTIN Name",
      "PAN Number",
      "PAN Name",
      "TDS Applicable (Yes/No)",
      "TDS Section",
      "TDS Percentage",
      "Address Line 1 *",
      "Address Line 2",
      "City *",
      "State *",
      "Country",
      "Pincode *",
      "Bank Account Holder Name",
      "Bank Name",
      "Bank Account Number",
      "Bank IFSC Code",
      "Bank SWIFT Code",
      "Bank Branch Name"
    ];

    const sampleRow1 = [
      "Company",
      "Aventis Technologies Pvt Ltd",
      "Aventis Technologies",
      "9876543210",
      "billing@aventis.com",
      "accounts@aventis.com, admin@aventis.com",
      "Active",
      "Yes",
      "27AAAAA1111A1Z1",
      "Aventis Technologies Private Limited",
      "ABCDE1234F",
      "Aventis Technologies Pvt Ltd",
      "Yes",
      "194C",
      "2.00",
      "404, Solitaire Corporate Park",
      "Chakala, Andheri East",
      "Mumbai",
      "Maharashtra",
      "India",
      "400093",
      "Aventis Technologies Pvt Ltd",
      "HDFC Bank",
      "50100234567890",
      "HDFC0000060",
      "HDFCINBB",
      "Andheri East Branch"
    ];

    const sampleRow2 = [
      "Individual",
      "",
      "John Doe",
      "9898989898",
      "john.doe@gmail.com",
      "",
      "Active",
      "No",
      "",
      "",
      "BCDEF5678G",
      "John Doe",
      "No",
      "",
      "",
      "Flat 101, Green Meadows",
      "Sector 4, HSR Layout",
      "Bengaluru",
      "Karnataka",
      "India",
      "560102",
      "John Doe",
      "ICICI Bank",
      "000401234567",
      "ICIC0000004",
      "",
      "HSR Layout Branch"
    ];

    const ws_data = [headers, sampleRow1, sampleRow2];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Template");
    XLSX.writeFile(wb, "Vendors_Import_Template.xlsx");
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
        // Strip out completely empty rows
        const values = Object.values(row).map(v => String(v).trim());
        return values.some(v => v !== "");
      });

      if (filteredJson.length === 0) {
        throw new Error("No rows found. Please ensure your Excel file contains vendor data.");
      }

      const rows: ParsedRow[] = filteredJson.map((row) => {
        const errors: string[] = [];
        const vendor: Partial<Vendor> = {
          ccEmails: []
        };

        // Normalize keys by removing asterisks, parentheses contents, and double spaces
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key
            .replace(/\*/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
          normalizedRow[cleanKey] = row[key];
        });

        // 1. Vendor Type
        const typeRaw = normalizedRow["vendor type"]?.toString().trim().toLowerCase();
        let vendorType: 'individual' | 'company' = 'company';
        if (!typeRaw) {
          errors.push("Vendor Type is required");
        } else if (typeRaw === "individual") {
          vendorType = "individual";
        } else if (typeRaw === "company") {
          vendorType = "company";
        } else {
          errors.push("Vendor Type must be either 'Individual' or 'Company'");
        }
        vendor.vendorType = vendorType;

        // 2. Vendor Name
        const name = normalizedRow["vendor name"]?.toString().trim();
        if (!name) {
          errors.push("Vendor Name is required");
        } else if (name.length < 2) {
          errors.push("Vendor Name must be at least 2 characters");
        }
        vendor.name = name;

        // 3. Company Name (conditional)
        const companyName = normalizedRow["company name"]?.toString().trim() || "";
        if (vendorType === "company") {
          if (!companyName) {
            errors.push("Company Name is required for 'Company' vendor type");
          } else if (companyName.length < 2) {
            errors.push("Company Name must be at least 2 characters");
          }
        }
        vendor.companyName = vendorType === "company" ? companyName : "";

        // 4. Phone Number
        const phone = normalizedRow["phone number"]?.toString().trim();
        if (!phone) {
          errors.push("Phone Number is required");
        } else if (!/^[0-9]{10}$/.test(phone)) {
          errors.push("Phone Number must be a valid 10-digit Indian phone number");
        }
        vendor.phone = phone;

        // 5. Email
        const email = normalizedRow["email"]?.toString().trim();
        if (!email) {
          errors.push("Email is required");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push("Invalid email format");
        }
        vendor.email = email;

        // 6. CC Emails
        const ccRaw = normalizedRow["cc emails"]?.toString().trim();
        if (ccRaw) {
          const ccList = ccRaw.split(',').map((e: string) => e.trim()).filter((e: string) => e !== "");
          const invalidCCs = ccList.filter((e: string) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
          if (invalidCCs.length > 0) {
            errors.push(`Invalid CC Email(s): ${invalidCCs.join(', ')}`);
          }
          vendor.ccEmails = ccList;
        } else {
          vendor.ccEmails = [];
        }

        // 7. Status
        const statusRaw = normalizedRow["status"]?.toString().trim().toLowerCase();
        if (statusRaw === "inactive") {
          vendor.status = "INACTIVE";
        } else {
          vendor.status = "ACTIVE";
        }

        // 8. GST Applicable
        const gstAppRaw = normalizedRow["gst applicable"]?.toString().trim().toLowerCase();
        const gstApplicable = gstAppRaw === "yes" || gstAppRaw === "true" || gstAppRaw === "y" || gstAppRaw === "company";
        vendor.gstApplicable = gstApplicable;

        // 9. GSTIN Number
        const gstin = normalizedRow["gstin number"]?.toString().trim().toUpperCase() || "";
        if (gstApplicable) {
          if (!gstin) {
            errors.push("GSTIN Number is required when GST Applicable is 'Yes'");
          } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/.test(gstin)) {
            errors.push("Must be a valid 15-digit GSTIN number (e.g. 27AAAAA1111A1Z1)");
          }
        }
        vendor.gstin = gstin;

        // 10. Verified GSTIN Name
        vendor.verifiedGstinName = normalizedRow["verified gstin name"]?.toString().trim() || "";

        // 11. PAN Number
        const pan = normalizedRow["pan number"]?.toString().trim().toUpperCase() || "";
        if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
          errors.push("Must be a valid Indian PAN format (e.g. ABCDE1234F)");
        }
        vendor.pan = pan;

        // 12. PAN Name
        vendor.panName = normalizedRow["pan name"]?.toString().trim() || "";

        // 13. TDS Applicable
        const tdsAppRaw = normalizedRow["tds applicable"]?.toString().trim().toLowerCase();
        const tdsApplicable = tdsAppRaw === "yes" || tdsAppRaw === "true" || tdsAppRaw === "y";
        vendor.tdsApplicable = tdsApplicable;

        // 14. TDS Section
        vendor.tdsSection = normalizedRow["tds section"]?.toString().trim() || "";

        // 15. TDS Percentage
        const tdsPercRaw = normalizedRow["tds percentage"]?.toString().trim();
        if (tdsPercRaw) {
          const tdsPerc = parseFloat(tdsPercRaw);
          if (isNaN(tdsPerc) || tdsPerc < 0 || tdsPerc > 100) {
            errors.push("TDS Percentage must be a valid number between 0 and 100");
          } else {
            vendor.tdsPercentage = tdsPercRaw;
          }
        } else {
          vendor.tdsPercentage = "";
        }

        // 16. Address Line 1
        const add1 = normalizedRow["address line 1"]?.toString().trim();
        if (!add1) {
          errors.push("Address Line 1 is required");
        } else if (add1.length < 5) {
          errors.push("Address Line 1 must be at least 5 characters");
        }
        vendor.address1 = add1;

        // 17. Address Line 2
        vendor.address2 = normalizedRow["address line 2"]?.toString().trim() || "";

        // 18. City
        const city = normalizedRow["city"]?.toString().trim();
        if (!city) {
          errors.push("City is required");
        } else if (city.length < 2) {
          errors.push("City must be at least 2 characters");
        }
        vendor.city = city;

        // 19. State
        const state = normalizedRow["state"]?.toString().trim();
        if (!state) {
          errors.push("State is required");
        } else if (state.length < 2) {
          errors.push("State must be at least 2 characters");
        }
        vendor.state = state;

        // 20. Country
        vendor.country = normalizedRow["country"]?.toString().trim() || "India";

        // 21. Pincode
        const pincode = normalizedRow["pincode"]?.toString().trim();
        if (!pincode) {
          errors.push("Pincode is required");
        } else if (!/^[1-9][0-9]{5}$/.test(pincode)) {
          errors.push("Pincode must be a valid 6-digit Indian PIN code");
        }
        vendor.pincode = pincode;

        // 22-27. Bank Details
        vendor.accountHolderName = normalizedRow["bank account holder name"]?.toString().trim() || "";
        vendor.bankName = normalizedRow["bank name"]?.toString().trim() || "";
        vendor.accountNumber = normalizedRow["bank account number"]?.toString().trim() || "";

        const ifsc = normalizedRow["bank ifsc code"]?.toString().trim().toUpperCase() || "";
        if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
          errors.push("Must be a valid 11-digit IFSC code (e.g. HDFC0001234)");
        }
        vendor.ifscCode = ifsc;

        vendor.swiftCode = normalizedRow["bank swift code"]?.toString().trim() || "";
        vendor.branchName = normalizedRow["bank branch name"]?.toString().trim() || "";

        return {
          isValid: errors.length === 0,
          errors,
          data: vendor,
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
      setError(null);
      await bulkAddVendors(validRows.map(r => r.data));
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
      <div className="fixed right-0 top-0 h-full w-[950px] bg-white shadow-2xl z-50 flex flex-col transition-transform">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Bulk Import Vendors</h2>
              <p className="text-sm text-gray-500">Import multiple vendors via Excel or CSV spreadsheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex flex-col gap-1.5 text-sm font-medium border border-red-100">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!parsedRows.length ? (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h3>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1.5 ml-1">
                  <li>Download the exact Vendor Excel template below.</li>
                  <li>Fill in your vendor details. Columns marked with an asterisk (*) are required.</li>
                  <li>Note that "Company Name" is strictly required only for the `Company` vendor type.</li>
                  <li>Do not change the header column names, as the system maps them automatically.</li>
                  <li>Upload the saved spreadsheet (.xlsx or .csv) here to review and validate it.</li>
                </ol>
                <button
                  onClick={downloadTemplate}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg shadow-sm border border-blue-200 hover:bg-blue-50 transition-colors text-sm cursor-pointer"
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
                  "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200",
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
                <h3 className="text-lg font-medium text-gray-900">Drop your spreadsheet here</h3>
                <p className="text-sm text-gray-500 mt-2">or click to browse from your computer</p>
                <p className="text-xs text-gray-400 mt-4">Supported formats: .xlsx, .xls, .csv</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  {hasErrors ? (
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  ) : (
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {totalValid} of {parsedRows.length} rows valid
                    </h3>
                    <p className="text-sm text-gray-500">
                      {hasErrors ? 'Please fix the errors in your file and re-upload' : 'All rows are valid and ready to import.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setParsedRows([]); setError(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer"
                >
                  Clear & Re-upload
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 outline outline-1 outline-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Vendor Type</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Vendor & Company</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Email & Phone</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Address & Pincode</th>
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
                          <td className="px-4 py-3">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase",
                              row.data.vendorType === "individual" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-purple-50 text-purple-700 border border-purple-100"
                            )}>
                              {row.data.vendorType || 'company'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.data.name || '-'}</div>
                            <div className="text-xs text-gray-500">{row.data.companyName || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">{row.data.email || '-'}</div>
                            <div className="text-xs text-gray-500">{row.data.phone || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 truncate max-w-[200px]" title={row.data.address1}>{row.data.address1 || '-'}</div>
                            <div className="text-xs text-gray-500">{row.data.city || '-'}, {row.data.state || '-'} ({row.data.pincode || '-'})</div>
                          </td>
                          <td className="px-4 py-3">
                            {row.errors.length > 0 ? (
                              <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5 max-w-[250px] overflow-hidden text-ellipsis">
                                {row.errors.map((e, idx) => <li key={idx} title={e}>{e}</li>)}
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
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !parsedRows.length || hasErrors}
            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              'Import Vendors'
            )}
          </button>
        </div>

      </div>
    </>
  );
}
