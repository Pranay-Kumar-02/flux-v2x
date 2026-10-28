import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Target directories
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

COLOR_RAW_GB = '#475569'    # Steel Grey (Baseline)
COLOR_ACAFDM = '#1D4ED8'    # Strong Royal Blue (Proposed ACAFDM)
COLOR_RF = '#D97706'        # Warm Amber (Random Forest)
COLOR_GLOBAL = '#94A3B8'    # Light Slate (Global Threshold)
COLOR_FPR = '#0284C7'       # Sky Blue
COLOR_FNR = '#DC2626'       # Crimson Red
COLOR_DELAY = '#475569'     # Slate Grey
COLOR_OVERHEAD = '#059669'  # Forest Emerald Green

def save_dual_formats(fig, base_name):
    for target_dir in [evidence_dir, fig_deliverable_dir]:
        png_path = os.path.join(target_dir, f"{base_name}.png")
        svg_path = os.path.join(target_dir, f"{base_name}.svg")
        fig.savefig(png_path, dpi=300, bbox_inches='tight', facecolor=BG_WHITE)
        fig.savefig(svg_path, bbox_inches='tight', facecolor=BG_WHITE)
        print(f"Saved {base_name} PNG & SVG to {target_dir}")

# ==============================================================================
# Figure 2(a): Detection Performance Comparison (Grouped Bar Chart)
# ==============================================================================
fig, ax = plt.subplots(figsize=(9, 5.2), dpi=300, facecolor=BG_WHITE)
ax.set_facecolor(PANEL_WHITE)

metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
raw_gb_vals = [89.75, 91.67, 60.55, 72.93]
acafdm_vals = [88.70, 93.65, 54.13, 68.60]

x = np.arange(len(metrics))
width = 0.34

rects1 = ax.bar(x - width/2, raw_gb_vals, width, label='Raw Gradient Boosting (Non-Contextual)',
                color=COLOR_RAW_GB, edgecolor='#334155', linewidth=1.0, zorder=3)
rects2 = ax.bar(x + width/2, acafdm_vals, width, label='Proposed ACAFDM (Context-Aware)',
                color=COLOR_ACAFDM, edgecolor='#1E40AF', linewidth=1.0, zorder=3)

# Value callouts on top of bars
for rect in rects1:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points",
                ha='center', va='bottom', fontsize=11, fontweight='bold', color=TEXT_DARK)

for rect in rects2:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points",
                ha='center', va='bottom', fontsize=11, fontweight='bold', color='#1D4ED8')

ax.set_title('Figure 2(a): Detection Performance Comparison\n(Held-out Vehicular Test Partition: 478 instances, Disjoint Scenario Split)',
             fontsize=13, fontweight='bold', color=TEXT_DARK, pad=14)
ax.set_xticks(x)
ax.set_xticklabels(metrics, fontsize=11.5, fontweight='bold', color=TEXT_DARK)
ax.set_ylim(0, 108)
ax.set_ylabel('Score Percentage (%)', fontsize=12, fontweight='bold', color=TEXT_DARK, labelpad=8)
ax.tick_params(colors=TEXT_DARK, labelsize=11)
ax.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)

legend = ax.legend(frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=10.5,
                   loc='lower right', framealpha=0.95)
for text in legend.get_texts():
    text.set_color(TEXT_DARK)

plt.tight_layout()
save_dual_formats(fig, "figure_2a_detection_performance")
plt.close(fig)

# ==============================================================================
# Figure 2(b): Classification Error Comparison (Side-by-Side Aligned Subplots)
# ==============================================================================
# Left: False Positive Rate (0-2.5% scale) so FPR difference is crystal clear
# Right: False Negative Rate (0-60% scale)
fig, (ax_fpr, ax_fnr) = plt.subplots(1, 2, figsize=(10, 5.0), dpi=300, facecolor=BG_WHITE)

models = ['Raw GB\n(Non-Contextual)', 'Proposed ACAFDM\n(Context-Aware)']
fpr_vals = [1.63, 1.08]
fnr_vals = [39.45, 45.87]

bar_width = 0.48

# Left Subplot: FPR
bars_fpr = ax_fpr.bar(models, fpr_vals, bar_width, color=[COLOR_RAW_GB, COLOR_FPR],
                      edgecolor=['#334155', '#0369A1'], linewidth=1.2, zorder=3)
ax_fpr.set_title('False Positive Rate (FPR)\n(Safety Critical: False Alarms on Benign Flows)',
                 fontsize=11.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_fpr.set_ylabel('False Positive Rate (%)', fontsize=11, fontweight='bold', color=TEXT_DARK)
ax_fpr.set_ylim(0, 2.5)
ax_fpr.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_fpr.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect in bars_fpr:
    h = rect.get_height()
    ax_fpr.annotate(f'{h:.2f}%\n(FP={6 if h>1.5 else 4})',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', fontsize=11, fontweight='bold', color=TEXT_DARK)

# Add 33.7% reduction badge
ax_fpr.annotate('↓ 33.7% False Alarm Reduction', xy=(1, 1.08), xytext=(0.5, 2.0),
                ha='center', fontsize=10, fontweight='bold', color='#0369A1',
                bbox=dict(boxstyle="round,pad=0.3", fc="#E0F2FE", ec="#0284C7", lw=1))

# Right Subplot: FNR
bars_fnr = ax_fnr.bar(models, fnr_vals, bar_width, color=[COLOR_RAW_GB, COLOR_FNR],
                      edgecolor=['#334155', '#B91C1C'], linewidth=1.2, zorder=3)
ax_fnr.set_title('False Negative Rate (FNR)\n(Attack Omission Rate on Subtle Surges)',
                 fontsize=11.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_fnr.set_ylabel('False Negative Rate (%)', fontsize=11, fontweight='bold', color=TEXT_DARK)
ax_fnr.set_ylim(0, 58)
ax_fnr.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_fnr.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect in bars_fnr:
    h = rect.get_height()
    ax_fnr.annotate(f'{h:.2f}%\n(FN={43 if h<42 else 50})',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', fontsize=11, fontweight='bold', color=TEXT_DARK)

fig.suptitle('Figure 2(b): Classification Error Trade-off Analysis (FPR vs. FNR Breakdown)',
             fontsize=13, fontweight='bold', color=TEXT_DARK, y=0.98)
plt.tight_layout()
save_dual_formats(fig, "figure_2b_classification_error")
plt.close(fig)

# ==============================================================================
# Figure 2(c): Detection Delay and Mitigation Overhead (Two Aligned Subplots)
# ==============================================================================
# Left: Detection Delay (ms); Right: Mitigation Overhead (% collateral loss)
fig, (ax_delay, ax_loss) = plt.subplots(1, 2, figsize=(10, 5.0), dpi=300, facecolor=BG_WHITE)

scenarios = ['Highway\n(Congested & Free-flow)', 'Metropolitan\n(Rush-Hour & Normal)']
delays = [0.865, 0.237]       # ms
overhead = [0.11, 0.40]       # % collateral loss

# Left Subplot: Delay
bars_delay = ax_delay.bar(scenarios, delays, bar_width, color=COLOR_DELAY,
                          edgecolor='#1E293B', linewidth=1.2, zorder=3)
ax_delay.axhline(5.0, color='#DC2626', linestyle=':', linewidth=1.5, label='5 ms Safety Threshold')
ax_delay.set_title('RSU Detection Processing Delay\n(Per-Record Feature & Inference Execution)',
                   fontsize=11.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_delay.set_ylabel('Latency (milliseconds)', fontsize=11, fontweight='bold', color=TEXT_DARK)
ax_delay.set_ylim(0, 1.2)
ax_delay.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_delay.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect in bars_delay:
    h = rect.get_height()
    ax_delay.annotate(f'{h:.3f} ms',
                      xy=(rect.get_x() + rect.get_width() / 2, h),
                      xytext=(0, 4), textcoords="offset points",
                      ha='center', va='bottom', fontsize=11, fontweight='bold', color=TEXT_DARK)

ax_delay.annotate('Well below 5.0 ms deadline\n(Real-Time Safety Compliant)', xy=(0.5, 0.95),
                  ha='center', fontsize=9.5, fontweight='bold', color='#059669',
                  bbox=dict(boxstyle="round,pad=0.3", fc="#ECFDF5", ec="#059669", lw=1))

# Right Subplot: Collateral Loss
bars_loss = ax_loss.bar(scenarios, overhead, bar_width, color=COLOR_OVERHEAD,
                        edgecolor='#047857', linewidth=1.2, zorder=3)
ax_loss.set_title('Selective Mitigation Overhead\n(Collateral Damage: Benign Packets Dropped)',
                  fontsize=11.5, fontweight='bold', color=TEXT_DARK, pad=12)
ax_loss.set_ylabel('Collateral Loss (%)', fontsize=11, fontweight='bold', color=TEXT_DARK)
ax_loss.set_ylim(0, 0.6)
ax_loss.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)
ax_loss.tick_params(colors=TEXT_DARK, labelsize=10.5)

for rect, count_label in zip(bars_loss, ['(685 / 68,324 pkts)', '(412 / 102,450 pkts)']):
    h = rect.get_height()
    ax_loss.annotate(f'{h:.2f}%\n{count_label}',
                     xy=(rect.get_x() + rect.get_width() / 2, h),
                     xytext=(0, 4), textcoords="offset points",
                     ha='center', va='bottom', fontsize=10.5, fontweight='bold', color=TEXT_DARK)

fig.suptitle('Figure 2(c): Scenario-Wise Operational Latency & Defensive Overhead Evaluation',
             fontsize=13, fontweight='bold', color=TEXT_DARK, y=0.98)
plt.tight_layout()
save_dual_formats(fig, "figure_2c_scenario_delay_overhead")
plt.close(fig)

# ==============================================================================
# Figure 2(d): Multi-Family Comparative Analysis & Ablation Benchmark
# ==============================================================================
fig, ax = plt.subplots(figsize=(9.5, 5.2), dpi=300, facecolor=BG_WHITE)
ax.set_facecolor(PANEL_WHITE)

configs = ['Global Rate\nThreshold', 'Raw GB\n(No Context)', 'Random Forest\n(Contextual)', 'Full ACAFDM\n(Context-Aware GB)']
acc_vals = [77.20, 89.75, 89.33, 88.70]
f1_vals  = [0.00,  72.93, 70.86, 68.60]
fpr_vals = [0.00,   1.63,  1.08,  1.08]

x = np.arange(len(configs))
width = 0.26

r_acc = ax.bar(x - width, acc_vals, width, label='Overall Accuracy (%)',
               color='#1D4ED8', edgecolor='#1E40AF', linewidth=1.0, zorder=3)
r_f1  = ax.bar(x, f1_vals, width, label='Malicious F1-Score (%)',
               color='#059669', edgecolor='#047857', linewidth=1.0, zorder=3)
r_fpr = ax.bar(x + width, fpr_vals, width, label='False Positive Rate (%)',
               color='#DC2626', edgecolor='#B91C1C', linewidth=1.0, zorder=3)

# Data labels
for rect in r_acc:
    h = rect.get_height()
    ax.annotate(f'{h:.1f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#1D4ED8')

for rect in r_f1:
    h = rect.get_height()
    if h > 0:
        ax.annotate(f'{h:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#059669')

for rect in r_fpr:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#DC2626')

ax.set_title('Figure 2(d): Multi-Family Architectural Comparative Analysis & Ablation\n(Empirically Evaluated on Held-out Vehicular Test Split: 478 instances)',
             fontsize=13, fontweight='bold', color=TEXT_DARK, pad=14)
ax.set_xticks(x)
ax.set_xticklabels(configs, fontsize=10.5, fontweight='bold', color=TEXT_DARK)
ax.set_ylim(0, 108)
ax.set_ylabel('Metric Value (%)', fontsize=12, fontweight='bold', color=TEXT_DARK, labelpad=8)
ax.tick_params(colors=TEXT_DARK, labelsize=10.5)
ax.grid(axis='y', linestyle='--', alpha=0.7, color=GRID_COLOR, zorder=0)

legend = ax.legend(frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=10.5,
                   loc='upper right', framealpha=0.95)
for text in legend.get_texts():
    text.set_color(TEXT_DARK)

plt.tight_layout()
save_dual_formats(fig, "figure_2d_ablation_study")
plt.close(fig)

print("ALL 4 HIGH-RESOLUTION PUBLICATION CHARTS EXPORTED CLEANLY.")
