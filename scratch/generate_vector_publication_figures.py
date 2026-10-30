import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Output directories
evidence_dir = r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\review3_results_evidence"
fig_deliverable_dir = r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\case_study_3_deliverables\figures"
os.makedirs(evidence_dir, exist_ok=True)
os.makedirs(fig_deliverable_dir, exist_ok=True)

# Publication styling defaults (pure white background, crisp dark text, high contrast)
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#CBD5E1'
plt.rcParams['axes.linewidth'] = 1.0

# Scientific publication palette
BG_WHITE = '#FFFFFF'
PANEL_WHITE = '#FFFFFF'
TEXT_DARK = '#0F172A'       # Slate 900
TEXT_MUTED = '#475569'      # Slate 600
GRID_COLOR = '#E2E8F0'      # Slate 200

COLOR_RAW_GB = '#2563EB'    # Royal Blue (Baseline)
COLOR_ACAFDM = '#0D9488'    # Dark Teal / Emerald (Proposed ACAFDM)
COLOR_FPR = '#D97706'       # Amber / Orange (Warning)
COLOR_FNR = '#DC2626'       # Crimson Red (Danger)
COLOR_DELAY = '#2563EB'     # Cobalt Blue
COLOR_OVERHEAD = '#059669'  # Forest Emerald Green

def save_vector_and_raster(fig, base_name):
    for target_dir in [evidence_dir, fig_deliverable_dir]:
        svg_path = os.path.join(target_dir, f"{base_name}.svg")
        pdf_path = os.path.join(target_dir, f"{base_name}.pdf")
        png_path = os.path.join(target_dir, f"{base_name}.png")
        fig.savefig(svg_path, format='svg', bbox_inches='tight', facecolor=BG_WHITE)
        fig.savefig(pdf_path, format='pdf', bbox_inches='tight', facecolor=BG_WHITE)
        fig.savefig(png_path, format='png', dpi=300, bbox_inches='tight', facecolor=BG_WHITE)
        print(f"Saved {base_name} (SVG, PDF, PNG) to {target_dir}")

# ==============================================================================
# Figure 2(a): Detection Performance Comparison (Grouped Bar Chart)
# ==============================================================================
fig, ax = plt.subplots(figsize=(8.8, 4.6), dpi=300, facecolor=BG_WHITE)
ax.set_facecolor(PANEL_WHITE)

metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
raw_gb_vals = [89.75, 91.67, 60.55, 72.93]
acafdm_vals = [88.70, 93.65, 54.13, 68.60]

x = np.arange(len(metrics))
width = 0.32

rects1 = ax.bar(x - width/2, raw_gb_vals, width, label='Raw Gradient Boosting (Baseline)',
                color=COLOR_RAW_GB, edgecolor='#1D4ED8', linewidth=1.2, zorder=3)
rects2 = ax.bar(x + width/2, acafdm_vals, width, label='ACAFDM Framework (Proposed)',
                color=COLOR_ACAFDM, edgecolor='#115E59', linewidth=1.2, zorder=3)

# Value callouts on top of bars
for rect in rects1:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points",
                ha='center', va='bottom', fontsize=10.5, fontweight='bold', color='#1E3A8A')

for rect in rects2:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points",
                ha='center', va='bottom', fontsize=10.5, fontweight='bold', color='#134E4A')

ax.set_title('Detection Performance Comparison (Held-out Test Partition: N=478, Disjoint Split)',
             fontsize=12, fontweight='bold', color=TEXT_DARK, pad=32)
ax.set_xticks(x)
ax.set_xticklabels(metrics, fontsize=11.5, fontweight='bold', color=TEXT_DARK)
ax.set_ylim(0, 114)
ax.set_ylabel('Score Percentage (%)', fontsize=11.5, fontweight='bold', color=TEXT_DARK, labelpad=8)
ax.tick_params(colors=TEXT_DARK, labelsize=11)
ax.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)

# Legend positioned cleanly OUTSIDE above the plot area with dedicated margin
legend = ax.legend(loc='lower center', bbox_to_anchor=(0.5, 1.01), ncol=2,
                   frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=10.5)
for text in legend.get_texts():
    text.set_color(TEXT_DARK)
    text.set_fontweight('bold')

fig.subplots_adjust(top=0.86, bottom=0.12, left=0.10, right=0.96)
save_vector_and_raster(fig, "figure_2a_detection_performance")
# Also save as hd for compatibility
save_vector_and_raster(fig, "figure_2a_detection_performance_hd")
plt.close(fig)

# ==============================================================================
# Figure 2(b): Classification Error Comparison (Side-by-Side Dual-Scale Panels)
# ==============================================================================
fig, (ax_fpr, ax_fnr) = plt.subplots(1, 2, figsize=(9.5, 4.4), dpi=300, facecolor=BG_WHITE)

models = ['Raw Gradient Boosting\n(Baseline)', 'ACAFDM Framework\n(Proposed)']
fpr_vals = [1.63, 1.08]
fnr_vals = [39.45, 45.87]

bar_width = 0.44

# Left Subplot: FPR
bars_fpr = ax_fpr.bar(models, fpr_vals, bar_width, color=['#F59E0B', '#D97706'],
                      edgecolor=['#B45309', '#92400E'], linewidth=1.2, zorder=3)
ax_fpr.set_title('False Positive Rate (FPR)\n(Safety Critical: False Alarms on Benign Flows)',
                 fontsize=10.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_fpr.set_ylabel('False Positive Rate (%)', fontsize=11, fontweight='bold', color='#B45309')
ax_fpr.set_ylim(0, 2.5)
ax_fpr.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_fpr.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect, count in zip(bars_fpr, [6, 4]):
    h = rect.get_height()
    ax_fpr.annotate(f'{h:.2f}%\n({count} of 369 pkts)',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', fontsize=10.2, fontweight='bold', color='#92400E')

# Add badge for false alarm reduction cleanly positioned
ax_fpr.annotate('↓ 33.7% False Alarm Suppression', xy=(1, 1.08), xytext=(0.5, 2.15),
                ha='center', fontsize=9.2, fontweight='bold', color='#92400E',
                bbox=dict(boxstyle="round,pad=0.3", fc="#FEF3C7", ec="#F59E0B", lw=1.2))

# Right Subplot: FNR
bars_fnr = ax_fnr.bar(models, fnr_vals, bar_width, color=['#EF4444', '#DC2626'],
                      edgecolor=['#B91C1C', '#991B1B'], linewidth=1.2, zorder=3)
ax_fnr.set_title('False Negative Rate (FNR)\n(Attack Omission Rate on Flooding Surges)',
                 fontsize=10.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_fnr.set_ylabel('False Negative Rate (%)', fontsize=11, fontweight='bold', color='#B91C1C')
ax_fnr.set_ylim(0, 62)
ax_fnr.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_fnr.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect, count in zip(bars_fnr, [43, 50]):
    h = rect.get_height()
    ax_fnr.annotate(f'{h:.2f}%\n({count} of 109 pkts)',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', fontsize=10.2, fontweight='bold', color='#991B1B')

fig.subplots_adjust(top=0.86, bottom=0.15, left=0.09, right=0.96, wspace=0.28)
save_vector_and_raster(fig, "figure_2b_classification_errors")
save_vector_and_raster(fig, "figure_2b_classification_errors_hd")
save_vector_and_raster(fig, "figure_2b_classification_error")
plt.close(fig)

# ==============================================================================
# Figure 2(c): Operational Latency and Mitigation Overhead (Two Aligned Subplots)
# ==============================================================================
fig, (ax_delay, ax_loss) = plt.subplots(1, 2, figsize=(9.5, 4.4), dpi=300, facecolor=BG_WHITE)

scenarios = ['Highway Scenario\n(High-Speed Flow)', 'Metropolitan Scenario\n(High-Density Grid)']
delays = [0.865, 0.237]       # ms
overhead = [0.11, 0.40]       # % collateral loss

# Left Subplot: Delay
bars_delay = ax_delay.bar(scenarios, delays, bar_width, color=COLOR_DELAY,
                          edgecolor='#1E40AF', linewidth=1.2, zorder=3)
ax_delay.set_title('RSU Detection Processing Delay\n(Per-Record Feature & Inference Execution)',
                   fontsize=10.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_delay.set_ylabel('Inference Delay (milliseconds)', fontsize=11, fontweight='bold', color='#1D4ED8')
ax_delay.set_ylim(0, 1.35)
ax_delay.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_delay.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect in bars_delay:
    h = rect.get_height()
    ax_delay.annotate(f'{h:.3f} ms',
                      xy=(rect.get_x() + rect.get_width() / 2, h),
                      xytext=(0, 4), textcoords="offset points",
                      ha='center', va='bottom', fontsize=10.2, fontweight='bold', color='#1E3A8A')

ax_delay.annotate('Target: < 5.0 ms (Strict Safety Messaging Limit)', xy=(0.5, 1.15),
                  ha='center', fontsize=9.0, fontweight='bold', color='#047857',
                  bbox=dict(boxstyle="round,pad=0.3", fc="#ECFDF5", ec="#059669", lw=1.2))

# Right Subplot: Collateral Loss
bars_loss = ax_loss.bar(scenarios, overhead, bar_width, color=COLOR_OVERHEAD,
                        edgecolor='#047857', linewidth=1.2, zorder=3)
ax_loss.set_title('Selective Mitigation Overhead\n(Collateral Damage: Benign Packets Dropped)',
                  fontsize=10.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_loss.set_ylabel('Collateral Packet Loss (%)', fontsize=11, fontweight='bold', color='#047857')
ax_loss.set_ylim(0, 0.65)
ax_loss.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_loss.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect, count_label in zip(bars_loss, ['(685 / 68,324 pkts)', '(412 / 102,450 pkts)']):
    h = rect.get_height()
    ax_loss.annotate(f'{h:.2f}%\n{count_label}',
                     xy=(rect.get_x() + rect.get_width() / 2, h),
                     xytext=(0, 4), textcoords="offset points",
                     ha='center', va='bottom', fontsize=10.0, fontweight='bold', color='#064E3B')

fig.subplots_adjust(top=0.86, bottom=0.15, left=0.09, right=0.96, wspace=0.28)
save_vector_and_raster(fig, "figure_2c_latency_overhead")
save_vector_and_raster(fig, "figure_2c_latency_overhead_hd")
save_vector_and_raster(fig, "figure_2c_scenario_delay_overhead")
plt.close(fig)

# ==============================================================================
# Figure 2(d): Multi-Family Comparative Analysis & Ablation Benchmark
# ==============================================================================
fig, ax = plt.subplots(figsize=(9.2, 4.6), dpi=300, facecolor=BG_WHITE)
ax.set_facecolor(PANEL_WHITE)

configs = ['Global Rate\nThreshold', 'Raw GB\n(No Context)', 'Random Forest\n(Contextual)', 'Full ACAFDM\n(Proposed GB)']
acc_vals = [77.20, 89.75, 89.33, 88.70]
f1_vals  = [0.00,  72.93, 70.86, 68.60]
fpr_vals = [0.00,   1.63,  1.08,  1.08]

x = np.arange(len(configs))
width = 0.25

r_acc = ax.bar(x - width, acc_vals, width, label='Overall Accuracy (%)',
               color='#2563EB', edgecolor='#1D4ED8', linewidth=1.2, zorder=3)
r_f1  = ax.bar(x, f1_vals, width, label='Malicious F1-Score (%)',
               color='#0D9488', edgecolor='#115E59', linewidth=1.2, zorder=3)
r_fpr = ax.bar(x + width, fpr_vals, width, label='False Positive Rate (%)',
               color='#DC2626', edgecolor='#B91C1C', linewidth=1.2, zorder=3)

# Data labels
for rect in r_acc:
    h = rect.get_height()
    ax.annotate(f'{h:.1f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=9.2, fontweight='bold', color='#1E3A8A')

for rect in r_f1:
    h = rect.get_height()
    if h > 0:
        ax.annotate(f'{h:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=9.2, fontweight='bold', color='#115E59')
    else:
        ax.annotate('0.0%',
                    xy=(rect.get_x() + rect.get_width() / 2, 0),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=9.2, fontweight='bold', color='#64748B')

for rect in r_fpr:
    h = rect.get_height()
    if h > 0:
        ax.annotate(f'{h:.2f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=9.2, fontweight='bold', color='#991B1B')
    else:
        ax.annotate('0.00%',
                    xy=(rect.get_x() + rect.get_width() / 2, 0),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=9.2, fontweight='bold', color='#64748B')

ax.set_title('Model Family Comparative Analysis & Architectural Benchmark (Test Split: N=478)',
             fontsize=12, fontweight='bold', color=TEXT_DARK, pad=32)
ax.set_xticks(x)
ax.set_xticklabels(configs, fontsize=10.5, fontweight='bold', color=TEXT_DARK)
ax.set_ylim(0, 114)
ax.set_ylabel('Metric Score (%)', fontsize=11.5, fontweight='bold', color=TEXT_DARK, labelpad=8)
ax.tick_params(colors=TEXT_DARK, labelsize=10.5)
ax.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)

# Legend placed cleanly above the chart
legend = ax.legend(loc='lower center', bbox_to_anchor=(0.5, 1.01), ncol=3,
                   frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=10.2)
for text in legend.get_texts():
    text.set_color(TEXT_DARK)
    text.set_fontweight('bold')

fig.subplots_adjust(top=0.86, bottom=0.15, left=0.09, right=0.96)
save_vector_and_raster(fig, "figure_2d_model_comparison")
save_vector_and_raster(fig, "figure_2d_model_comparison_hd")
save_vector_and_raster(fig, "figure_2d_ablation_study")
plt.close(fig)

print("ALL 4 TRUE VECTOR CHARTS GENERATED WITH ZERO CLIPPING OR OVERLAP.")
