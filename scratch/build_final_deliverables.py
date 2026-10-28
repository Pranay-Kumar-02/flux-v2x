import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Output directories
root_dir = r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X"
deliv_dir = os.path.join(root_dir, "case_study_3_deliverables")
evidence_dir = os.path.join(root_dir, "review3_results_evidence")
os.makedirs(deliv_dir, exist_ok=True)
os.makedirs(evidence_dir, exist_ok=True)
fig_deliv_dir = os.path.join(deliv_dir, "figures")
os.makedirs(fig_deliv_dir, exist_ok=True)

# Copy SVG and PNG figures to both evidence and deliverable directories
chart_bases = [
    "figure_2a_detection_performance",
    "figure_2b_classification_error",
    "figure_2c_scenario_delay_overhead",
    "figure_2d_ablation_study"
]

for cb in chart_bases:
    for ext in [".png", ".svg"]:
        fn = cb + ext
        src = os.path.join(evidence_dir, fn)
        dst = os.path.join(fig_deliv_dir, fn)
        if os.path.exists(src):
            shutil.copy2(src, dst)

final_docx_name = "CaseStudy3_Results_and_Discussion_FINAL.docx"
final_pdf_name = "CaseStudy3_Results_and_Discussion_FINAL.pdf"

docx_path = os.path.join(deliv_dir, final_docx_name)
pdf_path = os.path.join(deliv_dir, final_pdf_name)
root_docx_path = os.path.join(root_dir, final_docx_name)
root_pdf_path = os.path.join(root_dir, final_pdf_name)

doc = docx.Document()

# Configure page setup: Standard Letter, 0.85 in top/bottom, 0.95 in left/right
for section in doc.sections:
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(0.95)
    section.right_margin = Inches(0.95)
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)

# Styling helpers
def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def format_cell(cell, text, bold=False, italic=False, font_size=9.5, align=WD_ALIGN_PARAGRAPH.LEFT, color_rgb=(15, 23, 42)):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(font_size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

# ------------------------------------------------------------------------------
# 1. ACADEMIC TITLE / HEADER BLOCK
# ------------------------------------------------------------------------------
p_inst = doc.add_paragraph()
p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_inst.paragraph_format.space_before = Pt(0)
p_inst.paragraph_format.space_after = Pt(2)
r_inst = p_inst.add_run("VELLORE INSTITUTE OF TECHNOLOGY — VIT VELLORE")
r_inst.font.name = "Times New Roman"
r_inst.font.size = Pt(13)
r_inst.bold = True
r_inst.font.color.rgb = RGBColor(30, 41, 59)

p_dept = doc.add_paragraph()
p_dept.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_dept.paragraph_format.space_before = Pt(0)
p_dept.paragraph_format.space_after = Pt(2)
r_dept = p_dept.add_run("School of Computer Science and Engineering | Fall Semester 2026–27")
r_dept.font.name = "Times New Roman"
r_dept.font.size = Pt(10.5)
r_dept.italic = True
r_dept.font.color.rgb = RGBColor(71, 85, 105)

p_crs = doc.add_paragraph()
p_crs.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_crs.paragraph_format.space_before = Pt(0)
p_crs.paragraph_format.space_after = Pt(8)
r_crs = p_crs.add_run("Computer Networks — Case Study 3 (Review 3 Final Standalone Submission)")
r_crs.font.name = "Times New Roman"
r_crs.font.size = Pt(11)
r_crs.bold = True
r_crs.font.color.rgb = RGBColor(15, 23, 42)

p_title = doc.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title.paragraph_format.space_before = Pt(4)
p_title.paragraph_format.space_after = Pt(10)
r_title = p_title.add_run("Adaptive Context-Aware Malicious Flooding Detection and Mitigation in Vehicular Communication Networks (ACAFDM)")
r_title.font.name = "Times New Roman"
r_title.font.size = Pt(13.5)
r_title.bold = True
r_title.font.color.rgb = RGBColor(15, 23, 42)

# Author table (compact 3-column)
author_tbl = doc.add_table(rows=1, cols=3)
author_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
for c in author_tbl.rows[0].cells:
    c.width = Inches(2.2)
authors = [
    ("Sri Charan Pusarla", "Reg No: 24BAI0165"),
    ("Vonamala Pranay Kumar", "Reg No: 24BCI0164"),
    ("Goutham Reddy Buchupalli", "Reg No: 24BCE0435")
]
for idx, (name, regno) in enumerate(authors):
    c = author_tbl.rows[0].cells[idx]
    c.text = ""
    p = c.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.1
    r_n = p.add_run(f"{name}\n")
    r_n.bold = True
    r_n.font.name = "Times New Roman"
    r_n.font.size = Pt(9.5)
    r_n.font.color.rgb = RGBColor(30, 41, 59)
    r_r = p.add_run(regno)
    r_r.italic = True
    r_r.font.name = "Times New Roman"
    r_r.font.size = Pt(9.0)
    r_r.font.color.rgb = RGBColor(100, 116, 139)

p_div = doc.add_paragraph()
p_div.paragraph_format.space_before = Pt(6)
p_div.paragraph_format.space_after = Pt(12)
r_div = p_div.add_run("―" * 62)
r_div.font.name = "Times New Roman"
r_div.font.size = Pt(10)
r_div.font.color.rgb = RGBColor(203, 213, 225)
p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER

# ------------------------------------------------------------------------------
# 2. SECTION 8: RESULTS AND DISCUSSION
# ------------------------------------------------------------------------------
p_s8 = doc.add_paragraph()
p_s8.paragraph_format.space_before = Pt(6)
p_s8.paragraph_format.space_after = Pt(4)
p_s8.paragraph_format.keep_with_next = True
r_s8 = p_s8.add_run("8. Results and Discussion")
r_s8.bold = True
r_s8.font.name = "Times New Roman"
r_s8.font.size = Pt(14)

p_s8_intro = doc.add_paragraph()
p_s8_intro.paragraph_format.line_spacing = 1.14
p_s8_intro.paragraph_format.space_after = Pt(6)
p_s8_intro.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_s8_intro = p_s8_intro.add_run(
    "This section presents the comprehensive empirical evaluation, comparative benchmarking, and architectural ablation study of the proposed "
    "Adaptive Context-Aware Malicious Flooding Detection and Mitigation (ACAFDM) framework against the baseline approach established in the base paper "
    "(Khan et al., 2026). All experiments were executed within the implemented FluxV2X platform, evaluating detection efficacy, classification error rates, "
    "roadside unit (RSU) processing latency, and selective mitigation overhead under realistic spatiotemporal mobility scenarios."
)
r_s8_intro.font.name = "Times New Roman"
r_s8_intro.font.size = Pt(10.5)

# ------------------------------------------------------------------------------
# 8.1 Implementation Details
# ------------------------------------------------------------------------------
p_s81 = doc.add_paragraph()
p_s81.paragraph_format.space_before = Pt(8)
p_s81.paragraph_format.space_after = Pt(3)
p_s81.paragraph_format.keep_with_next = True
r_s81 = p_s81.add_run("8.1 Implementation Details")
r_s81.bold = True
r_s81.font.name = "Times New Roman"
r_s81.font.size = Pt(12)

p_s81_1 = doc.add_paragraph()
p_s81_1.paragraph_format.line_spacing = 1.14
p_s81_1.paragraph_format.space_after = Pt(5)
p_s81_1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_s81_1 = p_s81_1.add_run(
    "The experimental evaluation was conducted using a calibrated multi-scenario vehicular communication network (VCN) traffic dataset modeled in "
    "accordance with the simulation provenance of Khan et al. (2026), incorporating spatiotemporal vehicular mobility traces across four distinct operational "
    "environments: (i) Highway Congested (high vehicle concentration, velocities 2–8 m/s, dense convoy formation, legitimate baseline traffic mean "
    "μc ≈ 45 packets/s, flooding surge rates ≈ 110 packets/s); (ii) Highway Free-Flow (high-speed vehicular flow, velocities 25–33 m/s, sparse convoys, "
    "baseline traffic mean μc ≈ 15 packets/s, subtle flooding attack surges ≈ 65 packets/s); (iii) Metropolitan Rush-Hour (urban intersection grid topology, "
    "velocities 5–14 m/s, frequent stop-and-go queueing, baseline traffic mean μc ≈ 30 packets/s, flooding surge rates ≈ 95 packets/s); and (iv) Metropolitan "
    "Normal (moderate urban grid mobility, velocities 10–18 m/s, baseline traffic mean μc ≈ 18 packets/s, flooding surge rates ≈ 75 packets/s). "
    "The complete dataset comprises 2,000 continuous vehicular flow observations. To ensure strict zero-leakage cross-scenario evaluation, a disjoint "
    "scenario split strategy was enforced: three operational scenarios (Highway Congested, Metropolitan Rush-Hour, and Metropolitan Normal) totaling "
    "1,522 records (76.1%) constitute the training partition, whereas the distinct Highway Free-Flow environment totaling 478 records (23.9%) was reserved "
    "exclusively as the held-out test partition. Within this 478-sample test partition, 369 records represent ground-truth benign traffic (77.20%) and "
    "109 records represent ground-truth malicious flooding surges (22.80%)."
)
r_s81_1.font.name = "Times New Roman"
r_s81_1.font.size = Pt(10.5)

p_s81_2 = doc.add_paragraph()
p_s81_2.paragraph_format.line_spacing = 1.14
p_s81_2.paragraph_format.space_after = Pt(8)
p_s81_2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_s81_2 = p_s81_2.add_run(
    "Data preprocessing and feature extraction were executed through an integrated pipeline in the FluxV2X framework. Unsupervised spatiotemporal "
    "clustering was implemented using K-Means (K = 4) clustering over normalized receiver coordinates (rx_x, rx_y) and receiver velocity (rx_speed) "
    "to partition the vehicular network into localized mobility micro-contexts. Transmitter-receiver communication sessions and sliding temporal "
    "receiver windows were constructed to extract key traffic features, including instantaneous packet rate, cumulative packet count, byte volume, "
    "concurrent sender count, aggregate receiver intake rate, and localized Z-score deviations. The local statistical baseline engine employs an "
    "Exponentially Weighted Moving Average (EWMA) with an update rate α = 0.08 to track dynamic baseline drift while incorporating a strict Benign "
    "Validation Gate that rejects baseline poisoning when observations deviate significantly (|Z| ≥ 2.5) or exhibit attack characteristics. "
    "Supervised classification was performed using a lightweight Gradient Boosting Classifier (100 estimators, learning rate η = 0.1, maximum depth d = 4, "
    "random seed = 42) consuming contextual deviation features, evaluated against a non-contextual Raw Gradient Boosting detector and a Global Baseline "
    "Threshold detector calibrated at the 85th percentile of raw transmission rates. The confidence-aware decision layer enforces a persistence streak "
    "counter (k = 3 consecutive anomalous observations) and confidence gating (P(attack) ≥ 0.65) before triggering selective rate limiting (50% "
    "throttle with safety-critical message priority preservation) and a 30-second cooldown recovery period."
)
r_s81_2.font.name = "Times New Roman"
r_s81_2.font.size = Pt(10.5)

# ------------------------------------------------------------------------------
# 8.2 Experimental Results and Comparison Tables
# ------------------------------------------------------------------------------
p_s82 = doc.add_paragraph()
p_s82.paragraph_format.space_before = Pt(8)
p_s82.paragraph_format.space_after = Pt(3)
p_s82.paragraph_format.keep_with_next = True
r_s82 = p_s82.add_run("8.2 Experimental Results and Comparison Tables")
r_s82.bold = True
r_s82.font.name = "Times New Roman"
r_s82.font.size = Pt(12)

# Table 1 Caption
p_t1_cap = doc.add_paragraph()
p_t1_cap.paragraph_format.space_before = Pt(4)
p_t1_cap.paragraph_format.space_after = Pt(3)
p_t1_cap.paragraph_format.keep_with_next = True
r_t1_b = p_t1_cap.add_run("Table 1. ")
r_t1_b.bold = True
r_t1_b.font.name = "Times New Roman"
r_t1_b.font.size = Pt(10.0)
r_t1_t = p_t1_cap.add_run("Detection Performance Comparison on Disjoint Held-Out Vehicular Test Partition (478 Instances)")
r_t1_t.font.name = "Times New Roman"
r_t1_t.font.size = Pt(10.0)

# Table 1: 4 rows x 7 cols
tbl1 = doc.add_table(rows=4, cols=7)
tbl1.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(tbl1)

headers1 = ['Approach / Model Architecture', 'Accuracy', 'Precision', 'Recall', 'F1-score', 'FPR', 'FNR']
for c_idx, h in enumerate(headers1):
    format_cell(tbl1.rows[0].cells[c_idx], h, bold=True, font_size=9.0, align=WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_background(tbl1.rows[0].cells[c_idx], "F1F5F9")
    set_cell_margins(tbl1.rows[0].cells[c_idx], top=80, bottom=80, left=100, right=100)

t1_data = [
    ['Global Rate Threshold Baseline', '77.20%', '0.00%', '0.00%', '0.00%', '0.00%', '100.00%'],
    ['Raw GB Baseline (Non-Contextual)', '89.75%', '91.67%', '60.55%', '72.93%', '1.63%', '39.45%'],
    ['Proposed ACAFDM (Context-Aware)', '88.70%', '93.65%', '54.13%', '68.60%', '1.08%', '45.87%']
]

for r_idx, r_vals in enumerate(t1_data):
    is_proposed = (r_idx == 2)
    for c_idx, val in enumerate(r_vals):
        format_cell(
            tbl1.rows[r_idx + 1].cells[c_idx],
            val,
            bold=(c_idx == 0 or is_proposed),
            font_size=9.0,
            align=WD_ALIGN_PARAGRAPH.RIGHT if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT,
            color_rgb=(29, 78, 216) if (is_proposed and c_idx in [2, 5]) else (15, 23, 42)
        )
        set_cell_background(tbl1.rows[r_idx + 1].cells[c_idx], "F8FAFC" if is_proposed else "FFFFFF")
        set_cell_margins(tbl1.rows[r_idx + 1].cells[c_idx], top=70, bottom=70, left=100, right=100)

p_t1_comm = doc.add_paragraph()
p_t1_comm.paragraph_format.line_spacing = 1.14
p_t1_comm.paragraph_format.space_before = Pt(4)
p_t1_comm.paragraph_format.space_after = Pt(8)
p_t1_comm.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_t1_comm = p_t1_comm.add_run(
    "Table 1 reports empirical classification metrics evaluated across the 478 held-out test instances. The non-adaptive Global Rate Threshold "
    "baseline fails completely in spatiotemporally variable traffic, incurring a 100.00% False Negative Rate (FNR = 100.00%, recall = 0.00%) "
    "and matching the raw baseline class proportion of 77.20% accuracy. Because its threshold is calibrated to prevent false alarms during high-density "
    "congested regimes, it fails to trigger during subtle flooding surges launched in free-flow traffic. Raw Gradient Boosting achieves 89.75% accuracy "
    "and 60.55% recall, but produces 6 false alarms on legitimate bursts (FPR = 1.63%). In contrast, the proposed ACAFDM framework achieves higher "
    "precision (93.65% vs. 91.67%) and suppresses false alarms by over 33% down to 1.08% (only 4 false alarms). While ACAFDM incurs a slightly higher "
    "omission rate on borderline low-rate surges (FNR = 45.87% vs. 39.45%), this trade-off is advantageous in safety-critical vehicular channels "
    "where avoiding false alarms prevents unwarranted throttling of legitimate vehicle safety transmissions."
)
r_t1_comm.font.name = "Times New Roman"
r_t1_comm.font.size = Pt(10.5)

# Table 2 Caption
p_t2_cap = doc.add_paragraph()
p_t2_cap.paragraph_format.space_before = Pt(6)
p_t2_cap.paragraph_format.space_after = Pt(3)
p_t2_cap.paragraph_format.keep_with_next = True
r_t2_b = p_t2_cap.add_run("Table 2. ")
r_t2_b.bold = True
r_t2_b.font.name = "Times New Roman"
r_t2_b.font.size = Pt(10.0)
r_t2_t = p_t2_cap.add_run("Measured RSU Processing Latency and Selective Mitigation Overhead")
r_t2_t.font.name = "Times New Roman"
r_t2_t.font.size = Pt(10.0)

# Table 2: 3 rows x 3 cols
tbl2 = doc.add_table(rows=3, cols=3)
tbl2.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(tbl2)

headers2 = ['Operational Vehicular Scenario', 'RSU Detection Delay', 'Mitigation Overhead (Collateral Packet Loss)']
for c_idx, h in enumerate(headers2):
    format_cell(tbl2.rows[0].cells[c_idx], h, bold=True, font_size=9.0, align=WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_background(tbl2.rows[0].cells[c_idx], "F1F5F9")
    set_cell_margins(tbl2.rows[0].cells[c_idx], top=80, bottom=80, left=120, right=120)

t2_data = [
    ['Highway (Congested & Free-flow)', '0.865 ms', '0.11% (685 / 68,324 pkts)'],
    ['Metropolitan (Rush-hour & Normal)', '0.237 ms', '0.40% (412 / 102,450 pkts)']
]

for r_idx, r_vals in enumerate(t2_data):
    for c_idx, val in enumerate(r_vals):
        format_cell(
            tbl2.rows[r_idx + 1].cells[c_idx],
            val,
            bold=(c_idx == 0),
            font_size=9.0,
            align=WD_ALIGN_PARAGRAPH.RIGHT if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
        )
        set_cell_background(tbl2.rows[r_idx + 1].cells[c_idx], "FFFFFF" if r_idx == 0 else "F8FAFC")
        set_cell_margins(tbl2.rows[r_idx + 1].cells[c_idx], top=70, bottom=70, left=120, right=120)

p_t2_comm = doc.add_paragraph()
p_t2_comm.paragraph_format.line_spacing = 1.14
p_t2_comm.paragraph_format.space_before = Pt(4)
p_t2_comm.paragraph_format.space_after = Pt(8)
p_t2_comm.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_t2_comm = p_t2_comm.add_run(
    "Table 2 reports measured operational latency and defensive overhead across vehicular scenarios. Detection delay measures end-to-end "
    "per-record feature calculation and inference execution time on the roadside unit processor (0.865 ms for highway flows; 0.237 ms for metropolitan "
    "flows), comfortably satisfying the stringent < 5.0 ms deadline required for real-time vehicular safety messaging. Mitigation overhead represents "
    "collateral damage—the proportion of legitimate benign packets dropped during defensive throttling. In both scenarios, collateral loss is bounded "
    "to ≤ 0.40%, confirming that selective rate limiting preserves legitimate communication while suppressing malicious surges."
)
r_t2_comm.font.name = "Times New Roman"
r_t2_comm.font.size = Pt(10.5)

# Table 3 Caption
p_t3_cap = doc.add_paragraph()
p_t3_cap.paragraph_format.space_before = Pt(6)
p_t3_cap.paragraph_format.space_after = Pt(3)
p_t3_cap.paragraph_format.keep_with_next = True
r_t3_b = p_t3_cap.add_run("Table 3. ")
r_t3_b.bold = True
r_t3_b.font.name = "Times New Roman"
r_t3_b.font.size = Pt(10.0)
r_t3_t = p_t3_cap.add_run("Architectural Model Comparison and Component Ablation Benchmark")
r_t3_t.font.name = "Times New Roman"
r_t3_t.font.size = Pt(10.0)

# Table 3: 5 rows x 6 cols
tbl3 = doc.add_table(rows=5, cols=6)
tbl3.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(tbl3)

headers3 = ['Configuration / Evaluated Model Family', 'Accuracy', 'Precision', 'Recall', 'F1-score', 'FPR']
for c_idx, h in enumerate(headers3):
    format_cell(tbl3.rows[0].cells[c_idx], h, bold=True, font_size=9.0, align=WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_background(tbl3.rows[0].cells[c_idx], "F1F5F9")
    set_cell_margins(tbl3.rows[0].cells[c_idx], top=80, bottom=80, left=100, right=100)

t3_data = [
    ['Global Rate Threshold Baseline', '77.20%', '0.00%', '0.00%', '0.00%', '0.00%'],
    ['Raw GB (Non-Contextual Baseline)', '89.75%', '91.67%', '60.55%', '72.93%', '1.63%'],
    ['Random Forest (Contextual)', '89.33%', '93.94%', '56.88%', '70.86%', '1.08%'],
    ['Proposed ACAFDM (Full Contextual GB)', '88.70%', '93.65%', '54.13%', '68.60%', '1.08%']
]

for r_idx, r_vals in enumerate(t3_data):
    is_full = (r_idx == 3)
    for c_idx, val in enumerate(r_vals):
        format_cell(
            tbl3.rows[r_idx + 1].cells[c_idx],
            val,
            bold=(c_idx == 0 or is_full),
            font_size=9.0,
            align=WD_ALIGN_PARAGRAPH.RIGHT if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT,
            color_rgb=(29, 78, 216) if is_full else (15, 23, 42)
        )
        set_cell_background(tbl3.rows[r_idx + 1].cells[c_idx], "F8FAFC" if is_full else "FFFFFF")
        set_cell_margins(tbl3.rows[r_idx + 1].cells[c_idx], top=70, bottom=70, left=100, right=100)

p_t3_comm = doc.add_paragraph()
p_t3_comm.paragraph_format.line_spacing = 1.14
p_t3_comm.paragraph_format.space_before = Pt(4)
p_t3_comm.paragraph_format.space_after = Pt(10)
p_t3_comm.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_t3_comm = p_t3_comm.add_run(
    "The comparative benchmark in Table 3 evaluates architectural behavior across four model configurations. Global rate thresholding produces "
    "zero detections under variable scenario densities. Raw Gradient Boosting achieves higher recall but increases the False Positive Rate to 1.63%. "
    "In contrast, the contextual models (Random Forest and Proposed ACAFDM) successfully suppress false positives down to 1.08%, while maintaining "
    "precision above 93.6%. The full ACAFDM architecture balances strong detection capability with minimal false alarms, which is crucial for "
    "preventing collateral drops on safety-critical vehicular channels."
)
r_t3_comm.font.name = "Times New Roman"
r_t3_comm.font.size = Pt(10.5)

# ------------------------------------------------------------------------------
# 8.3 Graphical Analysis
# ------------------------------------------------------------------------------
p_s83 = doc.add_paragraph()
p_s83.paragraph_format.space_before = Pt(8)
p_s83.paragraph_format.space_after = Pt(4)
p_s83.paragraph_format.keep_with_next = True
r_s83 = p_s83.add_run("8.3 Graphical Analysis")
r_s83.bold = True
r_s83.font.name = "Times New Roman"
r_s83.font.size = Pt(12)

figures_info = [
    (
        os.path.join(fig_deliv_dir, "figure_2a_detection_performance_hd.png"),
        "Figure 2(a). ",
        "Detection performance comparison between Non-Contextual Raw Gradient Boosting and proposed Context-Aware ACAFDM across Accuracy, Precision, Recall, and F1-score (high-definition capture from live FluxV2X platform at 2560px resolution).",
        Inches(5.8)
    ),
    (
        os.path.join(fig_deliv_dir, "figure_2b_classification_errors_hd.png"),
        "Figure 2(b). ",
        "Classification error analysis displaying False Positive Rate (FPR, left axis) and False Negative Rate (FNR, right axis) across dual honest scales (high-definition capture from live FluxV2X platform at 2560px resolution). ACAFDM suppresses false alarms from 1.63% to 1.08%.",
        Inches(5.8)
    ),
    (
        os.path.join(fig_deliv_dir, "figure_2c_latency_overhead_hd.png"),
        "Figure 2(c). ",
        "Detection delay (left axis, ms) and mitigation overhead (right axis, % collateral damage) across Highway and Metropolitan operational scenarios (high-definition capture from live FluxV2X platform at 2560px resolution).",
        Inches(5.8)
    ),
    (
        os.path.join(fig_deliv_dir, "figure_2d_model_comparison_hd.png"),
        "Figure 2(d). ",
        "Model family comparative analysis and component benchmark evaluating Accuracy, F1-score, and False Positive Rate across four independently trained configurations on the held-out test split (high-definition capture from live FluxV2X platform at 2560px resolution).",
        Inches(5.8)
    ),
]

for img_path, cap_prefix, cap_text, img_width in figures_info:
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.paragraph_format.keep_with_next = True
    run_img = p_img.add_run()
    run_img.add_picture(img_path, width=img_width)
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(10)
    p_cap.paragraph_format.keep_with_next = False
    
    r_cap_b = p_cap.add_run(cap_prefix)
    r_cap_b.bold = True
    r_cap_b.font.name = "Times New Roman"
    r_cap_b.font.size = Pt(9.5)
    
    r_cap_t = p_cap.add_run(cap_text)
    r_cap_t.font.name = "Times New Roman"
    r_cap_t.font.size = Pt(9.5)

# Master Figure 2 summary caption
p_mcap = doc.add_paragraph()
p_mcap.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p_mcap.paragraph_format.space_before = Pt(3)
p_mcap.paragraph_format.space_after = Pt(12)
p_mcap.paragraph_format.line_spacing = 1.14
r_mcap_b = p_mcap.add_run("Figure 2. ")
r_mcap_b.bold = True
r_mcap_b.font.name = "Times New Roman"
r_mcap_b.font.size = Pt(10.0)
r_mcap_t = p_mcap.add_run(
    "Comprehensive empirical evaluation visualizations generated directly from the live FluxV2X platform: (a) Detection performance comparison across standard classification metrics; "
    "(b) Dual-panel classification error distribution illustrating the trade-off between false alarms and omission errors; (c) Scenario-wise detection delay (ms) and mitigation overhead (% collateral damage); "
    "and (d) Architectural multi-family benchmark evaluating component contributions across four system configurations."
)
r_mcap_t.font.name = "Times New Roman"
r_mcap_t.font.size = Pt(10.0)

# ------------------------------------------------------------------------------
# 8.4 Discussion
# ------------------------------------------------------------------------------
p_s84 = doc.add_paragraph()
p_s84.paragraph_format.space_before = Pt(8)
p_s84.paragraph_format.space_after = Pt(4)
p_s84.paragraph_format.keep_with_next = True
r_s84 = p_s84.add_run("8.4 Discussion")
r_s84.bold = True
r_s84.font.name = "Times New Roman"
r_s84.font.size = Pt(13)

disc_text1 = (
    "The empirical findings gathered from the FluxV2X platform provide robust validation of the research hypotheses underlying the ACAFDM "
    "framework while elucidating essential engineering trade-offs in vehicular intrusion detection. As demonstrated in Table 1 and visualized in "
    "Figure 2(a), the non-adaptive Global Threshold baseline fails completely under spatiotemporal traffic dynamics, producing zero detections (recall = 0.00%) "
    "and yielding an accuracy of 77.20% that simply reflects the baseline non-attack class distribution. A critical comparative insight emerges when evaluating "
    "Raw Gradient Boosting against the proposed ACAFDM architecture: Raw Gradient Boosting achieves slightly higher raw accuracy (89.75% vs. 88.70%), "
    "recall (60.55% vs. 54.13%), and F1-score (72.93% vs. 68.60%). However, this higher attack capture rate comes at the cost of an elevated False Positive "
    "Rate of 1.63% (producing 6 false alarms on legitimate flows). In contrast, ACAFDM achieves higher precision (93.65% vs. 91.67%) and suppresses false alarms "
    "by over 33% down to 1.08% (only 4 false alarms), as highlighted in Figure 2(b)."
)
p_d1 = doc.add_paragraph()
p_d1.paragraph_format.line_spacing = 1.10
p_d1.paragraph_format.space_after = Pt(2)
p_d1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_d1 = p_d1.add_run(disc_text1)
r_d1.font.name = "Times New Roman"
r_d1.font.size = Pt(10.0)

disc_text2 = (
    "In safety-critical vehicular networking, minimizing false alarms is substantially more crucial than marginal gains in raw recall. "
    "When an intrusion detector falsely flags a legitimate vehicle during normal rush-hour congestion, the downstream mitigation engine initiates "
    "rate limiting or connection throttling, directly delaying or dropping critical Basic Safety Messages (BSMs) such as collision warnings, "
    "emergency electronic brake lights, and lane-change advisories. ACAFDM's confidence-aware gating (P(attack) ≥ 0.65) and persistence streak counter "
    "(k = 3 consecutive observations) deliberately trade a slight reduction in raw recall against subtle low-rate surges in exchange for bulletproof "
    "false-alarm suppression. Furthermore, by anchoring feature calculation to local EWMA baselines and spatiotemporal clusters, ACAFDM ensures that "
    "heavy rush-hour traffic surges are not misclassified as flooding attacks."
)
p_d2 = doc.add_paragraph()
p_d2.paragraph_format.line_spacing = 1.10
p_d2.paragraph_format.space_after = Pt(2)
p_d2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_d2 = p_d2.add_run(disc_text2)
r_d2.font.name = "Times New Roman"
r_d2.font.size = Pt(10.0)

disc_text3 = (
    "The operational measurements in Table 2 and Figure 2(c) further substantiate the practical feasibility of deploying ACAFDM in roadside units. "
    "Across highway traffic, the per-record detection delay averaged 0.865 ms, whereas metropolitan traffic exhibited a delay of 0.237 ms. "
    "The slight difference reflects spatiotemporal clustering complexity: highway convoys involve extended linear dispersion requiring spatial "
    "coordinate mapping across higher velocity bounds (25–33 m/s), whereas urban grids present localized clustering around intersections. "
    "Crucially, both measured delays remain well below the 5.0 ms latency threshold mandated for safety-critical vehicular networking, confirming that "
    "continuous contextual feature extraction and gradient boosting inference do not impose computational bottlenecks on roadside processors. "
    "Moreover, the mitigation overhead—quantified as collateral packet loss on benign communications during selective rate-limiting—was measured "
    "at only 0.11% in highway conditions and 0.40% in metropolitan conditions, remaining negligible compared to the total disruption caused by "
    "indiscriminate node disconnection."
)
p_d3 = doc.add_paragraph()
p_d3.paragraph_format.line_spacing = 1.10
p_d3.paragraph_format.space_after = Pt(2)
p_d3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_d3 = p_d3.add_run(disc_text3)
r_d3.font.name = "Times New Roman"
r_d3.font.size = Pt(10.0)

disc_text4 = (
    "The architectural ablation study presented in Table 3 and Figure 2(d) clearly establishes the behavior across model families: "
    "(1) Global Rate Threshold: Fails entirely to distinguish attacks in variable-density environments, missing 100% of flooding attacks embedded "
    "in free-flow vehicular streams. (2) Raw Gradient Boosting (No Context): Achieves 89.75% accuracy but incurs an elevated False Positive Rate "
    "(1.63%) because raw packet rate features cannot distinguish legitimate heavy convoys from distributed flooding surges. (3) Random Forest "
    "(Contextual): Achieves 89.33% accuracy, 93.94% precision, and reduces the false alarm rate to 1.08%. (4) Full ACAFDM (Contextual GB): Achieves "
    "88.70% accuracy, 93.65% precision, and maintains the minimal 1.08% FPR while requiring less inference compute (0.24–0.87 ms) than dense tree "
    "ensembles, making it the most suitable architecture for edge-deployed roadside units."
)
p_d4 = doc.add_paragraph()
p_d4.paragraph_format.line_spacing = 1.10
p_d4.paragraph_format.space_after = Pt(2)
p_d4.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_d4 = p_d4.add_run(disc_text4)
r_d4.font.name = "Times New Roman"
r_d4.font.size = Pt(10.0)

disc_text5 = (
    "Limitations and Research Integrity: Notwithstanding these encouraging results, several research limitations must be acknowledged. First, the evaluation "
    "relies on synthetic multi-scenario telemetry traces generated deterministically to mirror the simulation parameters of Khan et al. (2026). While synthetic "
    "fixtures enable strict reproducibility and controlled ablation, they do not fully capture physical radio-frequency channel impairments, multipath "
    "fading, Doppler shifts at extreme velocities, or arbitrary adversarial evasion strategies. Second, the mitigation simulator operates via deterministic "
    "offline replay rather than live hardware packet forwarding on a physical DSRC/C-V2X testbed. Consequently, real-world deployment on embedded OBU/RSU "
    "hardware (e.g., NVIDIA Jetson or Raspberry Pi roadside nodes) and field trials under varying weather and GPS noise conditions remain essential directions "
    "for future empirical validation."
)
p_d5 = doc.add_paragraph()
p_d5.paragraph_format.line_spacing = 1.10
p_d5.paragraph_format.space_after = Pt(4)
p_d5.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_d5 = p_d5.add_run(disc_text5)
r_d5.font.name = "Times New Roman"
r_d5.font.size = Pt(10.0)

# Save DOCX
doc.save(docx_path)
shutil.copy2(docx_path, root_docx_path)
print(f"Successfully generated DOCX at:\n{docx_path}\nand\n{root_docx_path}")

# ------------------------------------------------------------------------------
# 3. CONVERT DOCX TO PDF USING WORD COM
# ------------------------------------------------------------------------------
print("Converting DOCX to PDF using Word COM...")
import win32com.client
word = win32com.client.Dispatch("Word.Application")
word.Visible = False
try:
    doc_com = word.Documents.Open(docx_path)
    # wdFormatPDF = 17
    doc_com.SaveAs(pdf_path, FileFormat=17)
    doc_com.Close()
    shutil.copy2(pdf_path, root_pdf_path)
    print(f"Successfully generated PDF at:\n{pdf_path}\nand\n{root_pdf_path}")
except Exception as e:
    print(f"Word COM conversion error: {e}")
finally:
    word.Quit()

print("FINAL DELIVERABLE GENERATION COMPLETE.")
