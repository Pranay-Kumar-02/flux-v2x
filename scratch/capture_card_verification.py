import asyncio
import os
from playwright.async_api import async_playwright

async def capture_specific_charts():
    evidence_dir = r"c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\scratch\browser_verification"
    os.makedirs(evidence_dir, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # 1. Light Theme Cards
        ctx_light = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx_light.new_page()
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await page.evaluate("""() => {
            localStorage.setItem('fluxv2x_theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }""")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.locator('button:has-text("Benchmark Center")').click()
        await page.wait_for_timeout(1500)
        
        cards = {
            "fig2a_light.png": "#figure-2a-card",
            "fig2b_light.png": "#figure-2b-card",
            "fig2c_light.png": "#figure-2c-card",
            "fig2d_light.png": "#figure-2d-card",
        }
        for name, sel in cards.items():
            loc = page.locator(sel)
            await loc.scroll_into_view_if_needed()
            await page.wait_for_timeout(500)
            await loc.screenshot(path=os.path.join(evidence_dir, name))
            print(f"Captured {name}")
            
        # 2. Dark Theme Cards
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
        
        cards_dark = {
            "fig2a_dark.png": "#figure-2a-card",
            "fig2b_dark.png": "#figure-2b-card",
            "fig2c_dark.png": "#figure-2c-card",
            "fig2d_dark.png": "#figure-2d-card",
        }
        for name, sel in cards_dark.items():
            loc = page.locator(sel)
            await loc.scroll_into_view_if_needed()
            await page.wait_for_timeout(500)
            await loc.screenshot(path=os.path.join(evidence_dir, name))
            print(f"Captured {name}")
            
        # 3. 200% Zoom Check on Figure 2b & 2d
        ctx_200 = await browser.new_context(viewport={"width": 800, "height": 900}, device_scale_factor=2.0)
        p_200 = await ctx_200.new_page()
        await p_200.goto("http://localhost:5173", wait_until="networkidle")
        await p_200.locator('button:has-text("Benchmark Center")').click()
        await p_200.wait_for_timeout(1500)
        for name, sel in [("fig2b_zoom200.png", "#figure-2b-card"), ("fig2d_zoom200.png", "#figure-2d-card")]:
            loc = p_200.locator(sel)
            await loc.scroll_into_view_if_needed()
            await p_200.wait_for_timeout(500)
            await loc.screenshot(path=os.path.join(evidence_dir, name))
            print(f"Captured {name}")

        await browser.close()
        print("ALL SPECIFIC CARD SCREENSHOTS CAPTURED!")

if __name__ == "__main__":
    asyncio.run(capture_specific_charts())
