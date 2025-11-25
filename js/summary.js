document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Load State
    const state = window.utils.loadState();
    if (!state.product || state.tests.length === 0) {
        alert("Brak danych audytu. Przekierowanie do strony startowej.");
        window.location.href = 'index.html';
        return;
    }

    // Calculate Stats
    const vals = Object.values(state.results);
    const passCount = vals.filter(x => x.status === 'pass' || x.status === 'Zaliczone').length;
    const failCount = vals.filter(x => x.status === 'fail' || x.status === 'Niezaliczone').length;
    const naCount = vals.filter(x => x.status === 'na' || x.status === 'Nie dotyczy').length;
    const ntCount = vals.filter(x => x.status === 'nt').length;

    // Render Stats
    document.getElementById('summary-product').innerText = state.product;
    document.getElementById('res-pass').innerText = passCount;
    document.getElementById('res-fail').innerText = failCount;
    document.getElementById('res-na').innerText = naCount;
    document.getElementById('res-nt').innerText = ntCount;

    // New Audit Button
    window.resetAudit = function () {
        if (confirm("Czy na pewno chcesz rozpocząć nowy audyt? Wszystkie niezapisane dane zostaną utracone.")) {
            window.utils.clearState();
            window.location.href = 'index.html';
        }
    };

    // --- Export Functions ---

    document.getElementById('export-json-btn').addEventListener('click', () => {
        const report = {
            title: "Raport z badania zgodności z normą EN 301 549",
            product: state.product,
            date: new Date().toISOString(),
            results: state.results,
            tests: state.tests.map(t => ({
                id: t.id,
                title: t.title,
                result: state.results[t.id] ? state.results[t.id].status : null,
                note: state.results[t.id] ? state.results[t.id].note : ''
            }))
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "raport_eaa.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
        let csv = `Produkt;${state.product}\nData;${new Date().toLocaleString()}\n\n`;
        csv += `ID;Tytuł;Wynik;Uwagi\n`;

        state.tests.forEach(t => {
            const res = state.results[t.id] || { status: 'not-tested', note: '' };
            const title = (t.title || '').replace(/[;\n\r]/g, ' ');
            const status = (res.status || 'not-tested');
            const note = (res.note || '').replace(/[;\n\r]/g, ' ');
            csv += `${t.id};${title};${status};${note}\n`;
        });

        const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'raport_eaa.csv');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('export-odt-btn').addEventListener('click', () => {
        const zip = new JSZip();
        const reportTitle = `Raport: ${state.product}`;

        const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
    <office:styles>
        <style:style style:name="Standard" style:family="paragraph" />
        <style:style style:name="T1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="24pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="Tbl1" style:family="table">
            <style:table-properties table:border-model="collapsing" />
        </style:style>
        <style:style style:name="Tbl1.A" style:family="table-column"><style:table-column-properties style:column-width="4cm"/></style:style>
        <style:style style:name="Tbl1.B" style:family="table-column"><style:table-column-properties style:column-width="8cm"/></style:style>
        <style:style style:name="Tbl1.C" style:family="table-column"><style:table-column-properties style:column-width="3cm"/></style:style>
        <style:style style:name="Tbl1.D" style:family="table-column"><style:table-column-properties style:column-width="5cm"/></style:style>
    </office:styles>
</office:document-styles>`;

        let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
    <office:body>
        <office:text>
            <text:h text:style-name="T1">${window.utils.xmlEscape(reportTitle)}</text:h>
            <text:p>Data badania: ${new Date().toLocaleString('pl-PL')}</text:p>
            
            <table:table table:name="ReportTable" table:style-name="Tbl1">
                <table:table-column table:style-name="Tbl1.A"/>
                <table:table-column table:style-name="Tbl1.B"/>
                <table:table-column table:style-name="Tbl1.C"/>
                <table:table-column table:style-name="Tbl1.D"/>
                <table:table-header-rows>
                    <table:table-row>
                        <table:table-cell office:value-type="string"><text:p>ID</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Tytuł</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Wynik</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Uwagi</text:p></table:table-cell>
                    </table:table-row>
                </table:table-header-rows>`;

        state.tests.forEach(t => {
            const res = state.results[t.id] || { status: 'brak', note: '' };
            contentXml += `<table:table-row>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(t.id)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(t.title)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(res.status || 'brak')}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(res.note || '')}</text:p></table:table-cell>
            </table:table-row>`;
        });

        contentXml += `</table:table>
        </office:text>
    </office:body>
</office:document-content>`;

        const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
    <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
</manifest:manifest>`;

        zip.file("mimetype", "application/vnd.oasis.opendocument.text");
        zip.file("styles.xml", stylesXml);
        zip.file("content.xml", contentXml);
        zip.folder("META-INF").file("manifest.xml", manifestXml);

        zip.generateAsync({ type: "blob", mimeType: "application/vnd.oasis.opendocument.text" }).then(function (content) {
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", URL.createObjectURL(content));
            downloadAnchorNode.setAttribute("download", "raport_eaa.odt");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    });
});
