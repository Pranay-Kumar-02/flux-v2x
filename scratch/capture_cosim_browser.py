import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def capture_cosim():
    artifact_dir = Path(r"C:\Users\PRANAY KUMAR\.gemini\antigravity\brain\5658de85-53e8-4f08-9c4e-526f6b921f7b")
    artifact_dir.mkdir(parents=True, exist_ok=True)

    evidence_dir = Path(r"C:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\scratch\browser_verification")
    evidence_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.0
        )
        page = await context.new_page()

        print("Navigating to http://localhost:5173...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)

        # Click on Co-Simulation Studio in sidebar
        print("Clicking Co-Simulation Studio...")
        cosim_btn = page.locator("button:has-text('Co-Simulation Studio')")
        if await cosim_btn.count() > 0:
            await cosim_btn.click()
            await asyncio.sleep(2)

        # Click Start Co-Simulation
        print("Clicking Start Co-Simulation...")
        start_btn = page.locator("button:has-text('Start Co-Simulation')")
        if await start_btn.count() > 0:
            await start_btn.click()
            print("Co-Simulation triggered! Waiting for real TraCI & NS-3 steps...")
            await asyncio.sleep(6)

        # Capture Screenshot 1: Full Viewport
        shot1_path = artifact_dir / "cosim_studio_live_viewport.png"
        shot1_local = evidence_dir / "cosim_studio_live_viewport.png"
        await page.screenshot(path=str(shot1_path), full_page=False)
        await page.screenshot(path=str(shot1_local), full_page=False)
        print(f"Captured live viewport screenshot: {shot1_path}")

        # Scroll down slightly to capture telemetry & live ACAFDM stream
        await page.mouse.wheel(0, 400)
        await asyncio.sleep(2)
        shot2_path = artifact_dir / "cosim_studio_telemetry_stream.png"
        shot2_local = evidence_dir / "cosim_studio_telemetry_stream.png"
        await page.screenshot(path=str(shot2_path), full_page=False)
        await page.screenshot(path=str(shot2_local), full_page=False)
        print(f"Captured telemetry stream screenshot: {shot2_path}")

        await browser.close()
        print("Browser capture complete.")

if __name__ == "__main__":
    asyncio.run(capture_cosim())

