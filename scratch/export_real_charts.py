import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

os.makedirs(r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\review3_results_evidence", exist_ok=True)
out_dir = r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\review3_results_evidence"

# Set publication style: clean, modern, high contrast
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Inter', 'DejaVu Sans', 'Arial']
plt.rcParams['axes.edgecolor'] = '#2D3748'
plt.rcParams['axes.linewidth'] = 0.8

# Color tokens matching FluxV2X Obsidian/Graphite theme
BG_COLOR = '#0D1117'
PANEL_COLOR = '#161B22'
TEXT_COLOR = '#E6EDF3'
MUTED_COLOR = '#8B949E'
ACCENT_BLUE = '#38BDF8'      # Proposed ACAFDM
SECONDARY_GREY = '#64748B'   # Baseline
DANGER_RED = '#EF4444'       # FNR / Error
SAGE_GREEN = '#10B981'       # F1 / Low Error

# ==============================================================================
# Figure 2(a): Detection Performance Comparison (Real Empirical Metrics)
# ==============================================================================
fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300, facecolor=BG_COLOR)
ax.set_facecolor(PANEL_COLOR)

metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
# Real evaluated metrics from VCN held-out partition
baseline_vals = [77.20, 0.00, 0.00, 0.00]      # Global threshold misses freeflow attacks
raw_gb_vals   = [89.75, 91.67, 60.55, 72.93]    # Raw GB baseline
acafdm_vals   = [88.70, 93.65, 54.13, 68.60]    # Contextual ACAFDM (Realistic Overlap)

x = np.arange(len(metrics))
width = 0.35

rects1 = ax.bar(x - width/2, raw_gb_vals, width, label='Non-Contextual Baseline (Raw GB)', color=SECONDARY_GREY, edgecolor='none', zorder=3)
rects2 = ax.bar(x + width/2, acafdm_vals, width, label='Proposed ACAFDM (Context-Aware)', color=ACCENT_BLUE, edgecolor='none', zorder=3)

# Value labels on top of bars
for rect in rects1:
    h = rect.get_height()
    if h > 0:
        ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points", ha='center', va='bottom',
                    fontsize=8.5, color=MUTED_COLOR, fontweight='bold')

for rect in rects2:
    h = rect.get_height()
    if h > 0:
        ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points", ha='center', va='bottom',
                    fontsize=8.5, color=ACCENT_BLUE, fontweight='bold')

ax.set_title('Figure 2(a): Detection Performance Comparison\n(Held-out Test Partition: 489 instances, Disjoint Scenario Split)',
             fontsize=11, fontweight='bold', color=TEXT_COLOR, pad=12)
ax.set_xticks(x)
ax.set_xticklabels(metrics, fontsize=9.5, color=TEXT_COLOR)
ax.set_ylim(0, 105)
ax.set_ylabel('Percentage (%)', fontsize=9.5, color=MUTED_COLOR)
ax.tick_params(colors=MUTED_COLOR, labelsize=8.5)
ax.grid(axis='y', linestyle='--', alpha=0.15, color='#CBD5E1', zorder=0)
legend = ax.legend(frameon=True, facecolor=BG_COLOR, edgecolor='#30363D', fontsize=8.5, labelcolor=TEXT_COLOR, loc='lower right')
plt.tight_layout()
fig2a_path = os.path.join(out_dir, "figure_2a_detection_performance.png")
plt.savefig(fig2a_path, facecolor=BG_COLOR, edgecolor='none')
plt.close()
print("Exported Figure 2a to:", fig2a_path)

# ==============================================================================
# Figure 2(b): Classification Error Comparison (FPR and FNR)
# ==============================================================================
fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300, facecolor=BG_COLOR)
ax.set_facecolor(PANEL_COLOR)

models = ['Non-Contextual Baseline\n(Raw GB)', 'Proposed ACAFDM\n(Context-Aware)']
fpr_vals = [1.63, 1.08]
fnr_vals = [39.45, 45.87]

x = np.arange(len(models))
width = 0.32

r_fpr = ax.bar(x - width/2, fpr_vals, width, label='False Positive Rate (FPR)', color='#38BDF8', edgecolor='none', zorder=3)
r_fnr = ax.bar(x + width/2, fnr_vals, width, label='False Negative Rate (FNR)', color=DANGER_RED, edgecolor='none', zorder=3)

for rect in r_fpr:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points", ha='center', va='bottom',
                fontsize=8.5, color='#38BDF8', fontweight='bold')

for rect in r_fnr:
    h = rect.get_height()
    ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points", ha='center', va='bottom',
                fontsize=8.5, color=DANGER_RED, fontweight='bold')

ax.set_title('Figure 2(b): Classification Error Trade-off\n(Comparison of False Positive Rate vs. False Negative Rate)',
             fontsize=11, fontweight='bold', color=TEXT_COLOR, pad=12)
ax.set_xticks(x)
ax.set_xticklabels(models, fontsize=9.5, color=TEXT_COLOR)
ax.set_ylim(0, 55)
ax.set_ylabel('Error Rate (%)', fontsize=9.5, color=MUTED_COLOR)
ax.tick_params(colors=MUTED_COLOR, labelsize=8.5)
ax.grid(axis='y', linestyle='--', alpha=0.15, color='#CBD5E1', zorder=0)
ax.legend(frameon=True, facecolor=BG_COLOR, edgecolor='#30363D', fontsize=8.5, labelcolor=TEXT_COLOR, loc='upper right')
plt.tight_layout()
fig2b_path = os.path.join(out_dir, "figure_2b_classification_error.png")
plt.savefig(fig2b_path, facecolor=BG_COLOR, edgecolor='none')
plt.close()
print("Exported Figure 2b to:", fig2b_path)

# ==============================================================================
# Figure 2(c): Scenario-wise Operational Evaluation (Delay vs Overhead)
# ==============================================================================
fig, ax1 = plt.subplots(figsize=(8, 4.5), dpi=300, facecolor=BG_COLOR)
ax1.set_facecolor(PANEL_COLOR)

scenarios = ['Highway\n(Congested & Freeflow)', 'Metropolitan\n(Rush-Hour & Normal)']
delays = [0.865, 0.237]       # ms
overhead = [0.11, 0.40]       # % collateral loss

x = np.arange(len(scenarios))
width = 0.28

r1 = ax1.bar(x - width/2, delays, width, label='Detection Delay (ms)', color=SECONDARY_GREY, edgecolor='none', zorder=3)
ax1.set_ylabel('Inference Delay (ms)', color=MUTED_COLOR, fontsize=9.5)
ax1.tick_params(axis='y', labelcolor=MUTED_COLOR, labelsize=8.5)
ax1.set_ylim(0, 1.2)
ax1.grid(axis='y', linestyle='--', alpha=0.15, color='#CBD5E1', zorder=0)

ax2 = ax1.twinx()
r2 = ax2.bar(x + width/2, overhead, width, label='Mitigation Overhead (% Collateral Loss)', color=SAGE_GREEN, edgecolor='none', zorder=3)
ax2.set_ylabel('Collateral Damage (% Benign Dropped)', color=SAGE_GREEN, fontsize=9.5)
ax2.tick_params(axis='y', labelcolor=SAGE_GREEN, labelsize=8.5)
ax2.set_ylim(0, 1.2)

for rect in r1:
    h = rect.get_height()
    ax1.annotate(f'{h:.3f} ms', xy=(rect.get_x() + rect.get_width() / 2, h),
                 xytext=(0, 3), textcoords="offset points", ha='center', va='bottom',
                 fontsize=8.5, color=SECONDARY_GREY, fontweight='bold')

for rect in r2:
    h = rect.get_height()
    ax2.annotate(f'{h:.2f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                 xytext=(0, 3), textcoords="offset points", ha='center', va='bottom',
                 fontsize=8.5, color=SAGE_GREEN, fontweight='bold')

ax1.set_title('Figure 2(c): Scenario-wise Operational Latency & Mitigation Overhead\n(Empirical Trace Replay & RSU Pipeline Execution)',
              fontsize=11, fontweight='bold', color=TEXT_COLOR, pad=12)
ax1.set_xticks(x)
ax1.set_xticklabels(scenarios, fontsize=9.5, color=TEXT_COLOR)
ax1.tick_params(axis='x', colors=TEXT_COLOR)

# Combined legend
lines = [r1, r2]
labels = [l.get_label() for l in lines]
ax1.legend(lines, labels, frameon=True, facecolor=BG_COLOR, edgecolor='#30363D', fontsize=8.5, labelcolor=TEXT_COLOR, loc='upper right')

plt.tight_layout()
fig2c_path = os.path.join(out_dir, "figure_2c_scenario_delay_overhead.png")
plt.savefig(fig2c_path, facecolor=BG_COLOR, edgecolor='none')
plt.close()
print("Exported Figure 2c to:", fig2c_path)

# ==============================================================================
# Figure 2(d): Architectural Ablation Study (Empirical Multi-Family Benchmark)
# ==============================================================================
fig, ax = plt.subplots(figsize=(8.5, 4.5), dpi=300, facecolor=BG_COLOR)
ax.set_facecolor(PANEL_COLOR)

configs = ['Global Rate\nThreshold', 'Raw GB\n(No Context)', 'Random Forest\n(Contextual)', 'Full ACAFDM\n(Context-Aware)']
acc_vals = [77.20, 89.75, 89.33, 88.70]
f1_vals  = [0.00,  72.93, 70.86, 68.60]
fpr_vals = [0.00,   1.63,  1.08,  1.08]

x = np.arange(len(configs))
width = 0.24

r_acc = ax.bar(x - width, acc_vals, width, label='Accuracy', color=ACCENT_BLUE, edgecolor='none', zorder=3)
r_f1  = ax.bar(x, f1_vals, width, label='Malicious F1-Score', color=SAGE_GREEN, edgecolor='none', zorder=3)
r_fpr = ax.bar(x + width, fpr_vals, width, label='False Positive Rate (FPR)', color=DANGER_RED, edgecolor='none', zorder=3)

for rect in r_acc:
    h = rect.get_height()
    ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 2), textcoords="offset points", ha='center', va='bottom',
                fontsize=7.5, color=ACCENT_BLUE, fontweight='bold')

for rect in r_f1:
    h = rect.get_height()
    if h > 0:
        ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 2), textcoords="offset points", ha='center', va='bottom',
                    fontsize=7.5, color=SAGE_GREEN, fontweight='bold')

for rect in r_fpr:
    h = rect.get_height()
    ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 2), textcoords="offset points", ha='center', va='bottom',
                fontsize=7.5, color=DANGER_RED, fontweight='bold')

ax.set_title('Figure 2(d): Multi-Family Architectural Comparative Analysis & Ablation\n(Empirically Evaluated on Held-out Vehicular Test Split)',
             fontsize=11, fontweight='bold', color=TEXT_COLOR, pad=12)
ax.set_xticks(x)
ax.set_xticklabels(configs, fontsize=8.5, color=TEXT_COLOR)
ax.set_ylim(0, 105)
ax.set_ylabel('Percentage (%)', fontsize=9.5, color=MUTED_COLOR)
ax.tick_params(colors=MUTED_COLOR, labelsize=8.5)
ax.grid(axis='y', linestyle='--', alpha=0.15, color='#CBD5E1', zorder=0)
ax.legend(frameon=True, facecolor=BG_COLOR, edgecolor='#30363D', fontsize=8.5, labelcolor=TEXT_COLOR, loc='center right')
plt.tight_layout()
fig2d_path = os.path.join(out_dir, "figure_2d_ablation_study.png")
plt.savefig(fig2d_path, facecolor=BG_COLOR, edgecolor='none')
plt.close()
print("Exported Figure 2d to:", fig2d_path)
