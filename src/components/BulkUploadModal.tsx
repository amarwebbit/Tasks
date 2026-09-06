'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTrinetra } from '@/lib/store';
import { TaskPriority } from '@/types/database';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Trash2,
  Plus,
  Loader2,
  Sparkles,
  Download,
  Check
} from 'lucide-react';
import { toFriendlyError } from '@/lib/friendlyError';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface ParsedTask {
  selected: boolean;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  definitionOfDone: string;
  assignedTo: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  projectId
}) => {
  const { createTasksBulk, currentUser, projects, getProjectMembers } = useTrinetra();

  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewTasks, setPreviewTasks] = useState<ParsedTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find(p => p.id === projectId);
  const projectMembers = projectId ? getProjectMembers(projectId) : [];
  const permittedAssignees = projectMembers.filter(m => m.can_receive_tasks);

  const findMatchingMemberId = (raw: string): string => {
    if (!raw) return currentUser?.id || '';
    const clean = raw.toLowerCase().trim();
    
    // 1. Try matching by Email
    const matchByEmail = permittedAssignees.find(
      m => m.profile?.email.toLowerCase() === clean
    );
    if (matchByEmail) return matchByEmail.user_id;
    
    // 2. Try matching by Full Name
    const matchByName = permittedAssignees.find(
      m => m.profile?.full_name?.toLowerCase() === clean
    );
    if (matchByName) return matchByName.user_id;

    // 3. Try matching by User ID
    const matchById = permittedAssignees.find(
      m => m.user_id === raw.trim()
    );
    if (matchById) return matchById.user_id;

    return currentUser?.id || '';
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setPasteText('');
      setPreviewTasks([]);
      setFileError(null);
      setError(null);
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Simple CSV parser supporting quotes & newlines
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.length > 0 && row.some(cell => cell !== '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      if (row.some(cell => cell !== '')) {
        lines.push(row);
      }
    }
    return lines;
  };

  const processImportData = (rows: string[][]) => {
    if (rows.length === 0) {
      setFileError('The file appears to be empty.');
      return;
    }

    // Try to detect headers in the first row
    const headers = rows[0].map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
    
    let titleIdx = 0;
    let descIdx = -1;
    let priorityIdx = -1;
    let dateIdx = -1;
    let dodIdx = -1;
    let assigneeIdx = -1;

    // Check if headers exist, otherwise default to column positions
    const hasHeaders = headers.includes('title') || headers.includes('task') || headers.includes('taskname');
    
    if (hasHeaders) {
      headers.forEach((header, index) => {
        if (header.includes('title') || header.includes('task') || header.includes('name')) {
          titleIdx = index;
        } else if (header.includes('desc') || header.includes('detail') || header.includes('content')) {
          descIdx = index;
        } else if (header.includes('prior') || header.includes('urgent')) {
          priorityIdx = index;
        } else if (header.includes('due') || header.includes('dead') || header.includes('date')) {
          dateIdx = index;
        } else if (header.includes('dod') || header.includes('done') || header.includes('criteria') || header.includes('accept')) {
          dodIdx = index;
        } else if (header.includes('assign') || header.includes('user') || header.includes('member') || header.includes('person') || header.includes('who') || header.includes('for')) {
          assigneeIdx = index;
        }
      });
    }

    const dataRows = hasHeaders ? rows.slice(1) : rows;
    const parsed: ParsedTask[] = dataRows
      .map(row => {
        const title = row[titleIdx] || '';
        if (!title.trim()) return null; // Skip empty rows

        const description = descIdx !== -1 ? row[descIdx] || '' : '';
        let priority: TaskPriority = 'MEDIUM';
        const rawPriority = priorityIdx !== -1 ? (row[priorityIdx] || '').toUpperCase() : '';
        if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(rawPriority)) {
          priority = rawPriority as TaskPriority;
        }

        const dueDate = dateIdx !== -1 ? row[dateIdx] || '' : '';
        const definitionOfDone = dodIdx !== -1 ? row[dodIdx] || '' : '';
        const rawAssignee = assigneeIdx !== -1 ? (row[assigneeIdx] || '').trim() : '';
        const assignedTo = findMatchingMemberId(rawAssignee);

        return {
          selected: true,
          title,
          description,
          priority,
          dueDate,
          definitionOfDone,
          assignedTo
        };
      })
      .filter((t): t is ParsedTask => t !== null);

    if (parsed.length === 0) {
      setFileError('Could not parse any valid tasks from the file.');
      return;
    }

    setPreviewTasks(prev => [...prev, ...parsed]);
    setFileError(null);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setError('Please paste some text first.');
      return;
    }

    // Split text by lines. Check if it's comma-separated or plain text
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedRows: string[][] = [];

    lines.forEach(line => {
      if (line.includes(',') && line.split(',').length > 1) {
        // Parse line as CSV
        const parsedLine = parseCSV(line);
        if (parsedLine.length > 0) {
          parsedRows.push(parsedLine[0]);
        }
      } else {
        // Treat complete line as title
        parsedRows.push([line]);
      }
    });

    processImportData(parsedRows);
    setPasteText('');
  };

  const handleFileUpload = async (file: File) => {
    setFileError(null);
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setFileError('Please upload a valid CSV (.csv) or Excel (.xlsx) file.');
      return;
    }

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          setFileError('The Excel file appears to be empty.');
          return;
        }

        const rows: string[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          const values: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const raw = cell.text || (cell.value !== null && cell.value !== undefined ? String(cell.value) : '');
            values[colNumber - 1] = raw.trim();
          });
          if (values.some(v => v !== '')) {
            rows.push(values);
          }
        });

        if (rows.length === 0) {
          setFileError('No readable rows found in the uploaded Excel worksheet.');
          return;
        }

        processImportData(rows);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error reading Excel file';
        setFileError(`Failed to parse Excel file: ${msg}`);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      processImportData(rows);
    };
    reader.onerror = () => {
      setFileError('Error reading CSV file.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Smart feature: Automatically distribute tasks evenly Mon-Fri
  const handleDistributeDeadlines = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 Sunday, 1 Monday, etc.
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const updated = previewTasks.map((t, idx) => {
      const offset = idx % 5; // Mon-Fri
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + offset);

      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');

      return {
        ...t,
        dueDate: `${yyyy}-${mm}-${dd}`
      };
    });

    setPreviewTasks(updated);
  };

  const handleCellChange = (index: number, key: keyof ParsedTask, value: any) => {
    const updated = [...previewTasks];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setPreviewTasks(updated);
  };

  const handleDeletePreview = (index: number) => {
    setPreviewTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleImportSubmit = async () => {
    const selectedTasks = previewTasks.filter(t => t.selected);
    if (selectedTasks.length === 0) {
      setError('Please select at least one task to import.');
      return;
    }

    // Verify all selected tasks have a title
    const invalidTask = selectedTasks.find(t => !t.title.trim());
    if (invalidTask) {
      setError('All selected tasks must have a title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Map and assign to selected users
      const tasksToInsert = selectedTasks.map(t => ({
        title: t.title.trim(),
        description: t.description.trim() || undefined,
        definition_of_done: t.definitionOfDone.trim() || undefined,
        assigned_to: t.assignedTo || undefined,
        priority: t.priority,
        due_date: t.dueDate ? new Date(t.dueDate).toISOString() : undefined
      }));

      const res = await createTasksBulk(projectId, tasksToInsert);
      if (!res.success) {
        setError(toFriendlyError(res.error, 'Failed to import tasks. Please try again.'));
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(toFriendlyError(err, 'An error occurred during import. Please try again.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-900">
              <Sparkles className="w-3.5 h-3.5 text-purple-950 animate-pulse" />
              <span>Bulk Task Allocator</span>
            </div>
            <h2 className="text-lg font-semibold text-stone-900">Upload Week's Tasks</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>Successfully imported and assigned all week tasks! Refreshing dashboards...</div>
            </div>
          )}

          {previewTasks.length === 0 ? (
            /* Input Phase */
            <div className="space-y-4">
              <div className="flex items-center border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('paste'); setFileError(null); }}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'border-purple-950 text-purple-950'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Tasks List</span>
                </button>

                <div className="flex items-center px-3 select-none">
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 bg-stone-100 rounded-full border border-stone-200">
                    OR
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => { setActiveTab('file'); setFileError(null); }}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'file'
                      ? 'border-purple-950 text-purple-950'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Excel / CSV File</span>
                </button>
              </div>

              {activeTab === 'paste' ? (
                <div className="space-y-4">
                  <div className="text-xs text-stone-600 leading-relaxed">
                    Type or paste your task titles (one per line). You can also paste comma-separated values matching: 
                    <code className="mx-1 px-1 bg-stone-100 border border-stone-200 rounded font-mono font-bold text-stone-800">
                      Title, Description, Priority, Due Date, DoD
                    </code>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="e.g.&#10;Write user login component&#10;Setup Supabase triggers&#10;Fix responsive alignment bug"
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
                  />
                  <div className="flex justify-between items-center">
                    <a
                      href="/sample_week_tasks.csv"
                      download
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-purple-950 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Detailed Sample CSV Template</span>
                    </a>
                    <button
                      onClick={handlePasteSubmit}
                      className="px-4 py-2 text-xs font-bold text-white bg-purple-950 hover:bg-purple-900 rounded-lg transition-colors cursor-pointer"
                    >
                      Process & Preview
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-purple-900 bg-purple-50/40'
                        : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-purple-50 text-purple-950 rounded-2xl shadow-2xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900">Drag & Drop Excel (.xlsx) or CSV File here</p>
                        <p className="text-xs text-stone-500 mt-1">or click to browse your local filesystem</p>
                      </div>
                    </div>
                  </div>

                  {fileError && (
                    <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2.5 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <a
                      href="/sample_week_tasks.csv"
                      download
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-purple-950 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Detailed Sample CSV Template</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Preview / Edit Phase */
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F4EFE6]/60 p-4 border border-[#E8E2D5] rounded-xl">
                <div className="text-xs text-stone-700">
                  <p className="font-bold text-stone-900">Automatic Allocation Activated</p>
                  <p className="mt-0.5">
                    Tasks will be automatically created in project <strong>[{project?.project_key}]</strong> and assigned to you: <strong>{currentUser?.full_name}</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDistributeDeadlines}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-purple-950 border border-purple-900/20 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Distribute Deadlines (Mon-Fri)
                  </button>
                  <button
                    onClick={() => {
                      setPreviewTasks(prev => [
                        ...prev,
                        {
                          selected: true,
                          title: '',
                          description: '',
                          priority: 'MEDIUM',
                          dueDate: '',
                          definitionOfDone: '',
                          assignedTo: currentUser?.id || ''
                        }
                      ]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Row
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full min-w-[800px] text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Import</th>
                        <th className="py-2.5 px-3">Title *</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 w-24">Priority</th>
                        <th className="py-2.5 px-3 w-32">Deadline</th>
                        <th className="py-2.5 px-3 w-40">Assignee</th>
                        <th className="py-2.5 px-3">Definition of Done</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {previewTasks.map((task, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-stone-50/50 transition-colors ${
                            !task.selected ? 'opacity-50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={task.selected}
                              onChange={e => handleCellChange(idx, 'selected', e.target.checked)}
                              className="rounded-sm accent-purple-950 border-stone-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={task.title}
                              onChange={e => handleCellChange(idx, 'title', e.target.value)}
                              placeholder="Task title..."
                              required
                              className={`w-full px-2 py-1 bg-transparent border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-800 ${
                                !task.title.trim() && task.selected
                                  ? 'border-red-300 bg-red-50/30'
                                  : 'border-transparent hover:border-stone-300'
                              }`}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={task.description}
                              onChange={e => handleCellChange(idx, 'description', e.target.value)}
                              placeholder="Optional context..."
                              className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-stone-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-800"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={task.priority}
                              onChange={e => handleCellChange(idx, 'priority', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent border border-transparent hover:border-stone-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-800"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={e => handleCellChange(idx, 'dueDate', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent border border-transparent hover:border-stone-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-800 text-[11px]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={task.assignedTo}
                              onChange={e => handleCellChange(idx, 'assignedTo', e.target.value)}
                              className="w-full px-1 py-1 bg-transparent border border-transparent hover:border-stone-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-800 text-stone-900"
                            >
                              <option value="">Unassigned (Draft)</option>
                              {permittedAssignees.map(m => (
                                <option key={m.user_id} value={m.user_id}>
                                  {m.profile?.full_name || m.profile?.email || m.user_id} {m.user_id === currentUser?.id ? '(You)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={task.definitionOfDone}
                              onChange={e => handleCellChange(idx, 'definitionOfDone', e.target.value)}
                              placeholder="Acceptance criteria..."
                              className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-stone-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-800"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleDeletePreview(idx)}
                              className="p-1 rounded-md text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPreviewTasks([])}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Clear & Reset
                </button>
                <div className="text-xs text-stone-500 font-medium">
                  {previewTasks.filter(t => t.selected).length} of {previewTasks.length} tasks selected for import
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {previewTasks.length > 0 && (
            <button
              onClick={handleImportSubmit}
              disabled={isSubmitting || isSuccess}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-950 hover:bg-purple-900 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Tasks...</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Imported!</span>
                </>
              ) : (
                <span>Import Tasks ({previewTasks.filter(t => t.selected).length})</span>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
