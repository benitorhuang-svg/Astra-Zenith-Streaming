import { PortalContext, DIRTY_CONTENT } from '../../PortalTypes';

/**
 * ArchiveHandler ??Handles selection, clearing, and PDF export of archives
 */
export class ArchiveHandler {
    constructor(private context: PortalContext) {}

    public handle(e: Event, find: (selector: string) => HTMLElement | undefined): boolean {
        // --- ARCHIVE LOGIC ---
        const archItem = find('.u-archive-item');
        if (archItem && !find('#u-btn-download-archive')) {
            const id = archItem.getAttribute('data-archive-id');
            if (id) {
                this.context._p.selectedArchiveId = id;
                this.context.scheduleRender(DIRTY_CONTENT);
            }
            return true;
        }

        // DOWNLOAD ARCHIVE AS PROFESSIONAL PDF (Tactical Manual)
        const downloadBtn = find('#u-btn-download-archive');
        if (downloadBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = downloadBtn.getAttribute('data-archive-id');
            const archive = this.context.archives.find(a => a.id === id);
            if (archive && archive.messages) {
                this.exportToTacticalPDF(archive);
                this.context._p.pushInternalLog(`PDF_PREPARATION_COMPLETE: ${id}`, 'SUCCESS');
            }
            return true;
        }

        if (find('#u-btn-clear-all-archive') || find('#u-btn-purge-archive-footer')) {
            if (confirm('Confirm purge all archives? This action is irreversible.')) {
                this.context.archives = [];
                this.context._p.selectedArchiveId = null;
                this.context.scheduleRender(DIRTY_CONTENT);
            }
            return true;
        }

        return false;
    }

    private exportToTacticalPDF(archive: any) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const messagesHtml = archive.messages.map((m: any) => {
            // Parse ## and ### for PDF styling
            const content = m.content
                .replace(/^##\s+(.*)$/gm, '<h2 class="pdf-h2">$1</h2>')
                .replace(/^###\s+(.*)$/gm, '<h3 class="pdf-h3">$1</h3>')
                .replace(/\n/g, '<br>');

            return `
                <div class="pdf-agent-block">
                    <div class="pdf-agent-header" style="border-left-color: ${m.agentColor}">
                        <span class="agent-name">${m.agentName}</span>
                        <span class="agent-meta">IDENT: ${m.agentCode} // ROUND: ${m.round}</span>
                    </div>
                    <div class="pdf-agent-content">${content}</div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>AZ_SDR_${archive.id}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
                    body { 
                        font-family: 'JetBrains Mono', monospace; 
                        background: #fff; color: #111; 
                        padding: 40px; line-height: 1.6;
                    }
                    .pdf-cover { 
                        text-align: center; border: 4px double #000; 
                        padding: 60px 20px; margin-bottom: 50px; 
                        page-break-after: always;
                        display: flex; flex-direction: column; justify-content: center; height: 80vh;
                    }
                    .pdf-title { font-size: 32px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; }
                    .pdf-subtitle { font-size: 14px; color: #666; letter-spacing: 0.3em; margin-bottom: 40px; }
                    .pdf-meta { font-size: 12px; margin-top: 20px; text-align: left; display: inline-block; }
                    
                    .pdf-agent-block { margin-bottom: 40px; page-break-inside: avoid; }
                    .pdf-agent-header { 
                        background: #f4f4f4; border-left: 10px solid #000; 
                        padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;
                        margin-bottom: 15px;
                    }
                    .agent-name { font-weight: 900; font-size: 16px; text-transform: uppercase; }
                    .agent-meta { font-size: 10px; color: #888; }
                    
                    .pdf-agent-content { padding: 0 20px; font-size: 13px; }
                    .pdf-h2 { background: #000; color: #fff; padding: 5px 15px; font-size: 15px; margin-top: 25px; text-transform: uppercase; }
                    .pdf-h3 { border-bottom: 2px solid #000; display: inline-block; font-size: 14px; margin-top: 20px; }
                    
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="pdf-cover">
                    <div class="pdf-title">Strategic Deployment Report</div>
                    <div class="pdf-subtitle">ASTRA ZENITH TACTICAL OPERATIONS</div>
                    <div class="pdf-meta">
                        <strong>MISSION_TOPIC:</strong> ${archive.title}<br>
                        <strong>MISSION_ID:</strong> ${archive.id}<br>
                        <strong>TIMESTAMP:</strong> ${archive.time}<br>
                        <strong>STATUS:</strong> VERIFIED_CONVERGENCE<br>
                        <strong>SECURITY:</strong> INDUSTRIAL_GRADE_ONLY
                    </div>
                </div>
                <div class="pdf-content-body">
                    ${messagesHtml}
                </div>
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}
