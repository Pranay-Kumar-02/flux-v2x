import asyncio
import os
from playwright.async_api import async_playwright
from PIL import Image

async def capture_charts():
    output_dirs = [
        r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\review3_results_evidence",
        r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\case_study_3_deliverables\figures"
    ]
    for d in output_dirs:
        os.makedirs(d, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # 2560px viewport with 2.0x scale -> crisp HD screenshots
        context = await browser.new_context(
            viewport={"width": 2560, "height": 1600},
            device_scale_factor=2.0
        )
        page = await context.new_page()

        print("Navigating to http://localhost:5173...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        
        # Set theme to light using correct key fluxv2x_theme
        await page.evaluate("""() => {
            localStorage.setItem('fluxv2x_theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-color-scheme', 'light');
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }""")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Click Benchmark Center in sidebar
        bench_btn = page.locator('button:has-text("Benchmark Center")')
        await bench_btn.click()
        await page.wait_for_timeout(1500)

        # Layout cards cleanly in block display so there is ZERO overlap
        await page.evaluate("""() => {
            const p1 = document.querySelector('#figure-2a-card')?.parentElement;
            if (p1) {
                p1.style.display = 'block';
            }
            const p2 = document.querySelector('#figure-2c-card')?.parentElement;
            if (p2) {
                p2.style.display = 'block';
            }
            ['#figure-2a-card', '#figure-2b-card', '#figure-2c-card', '#figure-2d-card'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) {
                    el.style.width = '1200px';
                    el.style.maxWidth = '1200px';
                    el.style.margin = '24px auto';
                    el.style.backgroundColor = '#FFFFFF';
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                    el.style.border = '1px solid #CBD5E1';
                }
            });
            window.dispatchEvent(new Event('resize'));
        }""")
        await page.wait_for_timeout(1500)

        cards = {
            "figure_2a_detection_performance_hd.png": "#figure-2a-card",
            "figure_2b_classification_errors_hd.png": "#figure-2b-card",
            "figure_2c_latency_overhead_hd.png": "#figure-2c-card",
            "figure_2d_model_comparison_hd.png": "#figure-2d-card",
        }

        for filename, selector in cards.items():
            locator = page.locator(selector)
            await locator.wait_for(state="visible", timeout=10000)
            
            for out_dir in output_dirs:
                target_path = os.path.join(out_dir, filename)
                await locator.screenshot(path=target_path)
                with Image.open(target_path) as im:
                    print(f"Captured {filename} -> {target_path} (size: {os.path.getsize(target_path)} bytes, dimensions: {im.size})")

        await browser.close()
        print("All 4 HD chart figures captured successfully in clean light theme!")

if __name__ == "__main__":
    asyncio.run(capture_charts())
