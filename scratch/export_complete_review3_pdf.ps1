$word = New-Object -ComObject Word.Application
$word.Visible = $false

$files = @(
    @{
        Docx = "c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_COMPLETE.docx"
        Pdf  = "c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_COMPLETE.pdf"
    },
    @{
        Docx = "c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_Results_Completed.docx"
        Pdf  = "c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_Results_Completed.pdf"
    }
)

try {
    foreach ($item in $files) {
        Write-Host "Opening: $($item.Docx)"
        $doc = $word.Documents.Open($item.Docx)
        Write-Host "Exporting PDF: $($item.Pdf)"
        $doc.ExportAsFixedFormat($item.Pdf, 17) # 17 = wdExportFormatPDF
        Write-Host "Saved PDF: $($item.Pdf)"
        $doc.Close(0)
    }
    Write-Host "ALL PDFS GENERATED SUCCESSFULLY!"
} catch {
    Write-Host "Error converting to PDF: $_"
} finally {
    $word.Quit()
}
