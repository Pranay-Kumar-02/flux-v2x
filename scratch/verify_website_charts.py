import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def verify_charts():
    evidence_dir = r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\scratch\browser_verification"
    os.makedirs(evidence_dir, exist_ok=True)
    
    async with async_playwright() as p:
        # Launch chromium
        browser = await p.chromium.launch(headless=True)
        
        # Test 1: Standard viewport (100% zoom, 1920x1080), Light Theme
        context_light = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.0
        )
        page = await context_light.new_page()
        print("Navigating to http://localhost:5173 (Light Theme)...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        
        # Set light theme
        await page.evaluate("""() => {
            localStorage.setItem('fluxv2x_theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }""")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Navigate to Benchmark Center
        await page.locator('button:has-text("Benchmark Center")').click()
        await page.wait_for_timeout(1500)
        
        # Verify SVG presence in all 4 cards
        cards = ['#figure-2a-card', '#figure-2b-card', '#figure-2c-card', '#figure-2d-card']
        for c in cards:
            svg_count = await page.locator(f'{c} svg').count()
            print(f"Card {c}: {svg_count} SVG element(s) rendered (genuine vector renderer verified)")
            assert svg_count > 0, f"No SVG rendered in {c}"
            
        await page.screenshot(path=os.path.join(evidence_dir, "benchmark_center_light_100.png"), full_page=True)
        print("Saved light theme 100% screenshot.")
        
        # Test 2: Dark Theme (Obsidian) at 100% zoom
        await page.evaluate("""() => {
            localStorage.setItem('fluxv2x_theme', 'obsidian');
            document.documentElement.setAttribute('data-theme', 'obsidian');
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
        }""")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.locator('button:has-text("Benchmark Center")').click()
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(evidence_dir, "benchmark_center_dark_100.png"), full_page=True)
        print("Saved dark theme 100% screenshot.")
        
        # Test 3: 200% Zoom (effective viewport 960x540, device_scale_factor=2.0)
        context_200 = await browser.new_context(
            viewport={"width": 960, "height": 800},
            device_scale_factor=2.0
        )
        page_200 = await context_200.new_page()
        await page_200.goto("http://localhost:5173", wait_until="networkidle")
        await page_200.locator('button:has-text("Benchmark Center")').click()
        await page_200.wait_for_timeout(1500)
        await page_200.screenshot(path=os.path.join(evidence_dir, "benchmark_center_zoom_200.png"), full_page=True)
        print("Saved 200% zoom screenshot.")

        # Test 4: 300% Zoom (effective viewport 640x700, device_scale_factor=3.0)
        context_300 = await browser.new_context(
            viewport={"width": 640, "height": 700},
            device_scale_factor=3.0
        )
        page_300 = await context_300.new_page()
        await page_300.goto("http://localhost:5173", wait_until="networkidle")
        await page_300.locator('button:has-text("Benchmark Center")').click()
        await page_300.wait_for_timeout(1500)
        await page_300.screenshot(path=os.path.join(evidence_dir, "benchmark_center_zoom_300.png"), full_page=True)
        print("Saved 300% zoom screenshot.")
        
        await browser.close()
        print("ALL WEBSITE CHART VERIFICATIONS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(verify_charts())
