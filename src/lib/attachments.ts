export const EXPENSE_BUCKET = "syndic-expense-files";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const attachmentTypes: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
};
export const attachmentAccept = Object.keys(attachmentTypes).join(",") + ",.pdf,.docx,.xlsx,.doc,.xls,.heic";
