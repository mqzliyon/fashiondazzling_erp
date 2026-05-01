type BuildStyledReportPdfOptions = {
  title: string;
  fromDate?: string;
  toDate?: string;
  generatedAt?: Date;
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
  totalItem?: number;
  pages?: number;
  columnsHtml: string;
  rowsHtml: string;
  emptyColspan: number;
};

type ReportHeaderOptions = {
  generatedDate: string;
  generatedTime: string;
  fromDate?: string;
  toDate?: string;
  totalItem?: number;
  pages?: number;
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
  subtitle?: string;
};

export const reportPdfHeaderStyles = `
  .top-banner { background: linear-gradient(90deg, #0f766e, #2563eb); color: white; padding: 16px; border-radius: 10px; margin-bottom: 14px; text-align: center; }
  .top-banner-head { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
  .company-logo { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.45); background: #ffffff; }
  .top-banner h1 { margin: 0; font-size: 22px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; }
  .top-banner p { margin: 4px 0 0 0; font-size: 12px; opacity: .95; color: #e6f3ff; }
  .business-subtext { margin-top: 2px; font-size: 11px; color: #e6f3ff; opacity: .95; }
  .meta-row { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
  .meta-pill { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 999px; padding: 4px 10px; font-size: 11px; }
`;

export function buildReportPdfHeaderHtml(options: ReportHeaderOptions) {
  const businessName = (options.businessName || "Fashion Dazzling BD ERP").trim();
  const businessAddress = (options.businessAddress || "").trim();
  const businessNumber = (options.businessNumber || "").trim();
  const businessLogo = (options.businessLogoUrl || "").trim();
  const subtitle = options.subtitle || "ERP Consolidated Production Report";

  return `
    <div class="top-banner">
      <div class="top-banner-head">
        ${businessLogo ? `<img class="company-logo" src="${businessLogo}" alt="Business Logo" />` : ""}
        <div>
          <h1>${businessName}</h1>
          <p>${subtitle}</p>
          ${businessAddress ? `<p class="business-subtext">${businessAddress}</p>` : ""}
          ${businessNumber ? `<p class="business-subtext">Business Number: ${businessNumber}</p>` : ""}
        </div>
      </div>
      <div class="meta-row">
        <span class="meta-pill"><strong>Date:</strong> ${options.generatedDate}</span>
        <span class="meta-pill"><strong>Time:</strong> ${options.generatedTime}</span>
        <span class="meta-pill"><strong>Total Item:</strong> ${Number(options.totalItem || 0)}</span>
        <span class="meta-pill"><strong>Pages:</strong> ${Number(options.pages || 1)}</span>
        <span class="meta-pill"><strong>Filter:</strong> ${options.fromDate || "Any"} to ${options.toDate || "Any"}</span>
      </div>
    </div>
  `;
}

export function buildStyledReportHtml(options: BuildStyledReportPdfOptions) {
  const generatedAt = options.generatedAt || new Date();
  const generatedDate = generatedAt.toLocaleDateString();
  const generatedTime = generatedAt.toLocaleTimeString();

  return `
    <html>
      <head>
        <title>${options.title}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          ${reportPdfHeaderStyles}
          .report-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 0 0 14px 0; }
          h2 { font-size: 13px; margin: 0 0 10px 0; color: #0f3a7a; text-transform: uppercase; letter-spacing: 0.4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; text-align: left; }
          th { background: #f1f5f9; }
          .footer { margin-top: 12px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        ${buildReportPdfHeaderHtml({
          generatedDate,
          generatedTime,
          fromDate: options.fromDate,
          toDate: options.toDate,
          totalItem: options.totalItem,
          pages: options.pages,
          businessName: options.businessName,
          businessAddress: options.businessAddress,
          businessNumber: options.businessNumber,
          businessLogoUrl: options.businessLogoUrl,
        })}
        <section class="report-card">
          <h2>${options.title}</h2>
          <table>
            <tr>${options.columnsHtml}</tr>
            ${options.rowsHtml || `<tr><td colspan="${options.emptyColspan}">No data found.</td></tr>`}
          </table>
        </section>
        <div class="footer">Developed by Mushfiquzzaman Liyon</div>
      </body>
    </html>
  `;
}

