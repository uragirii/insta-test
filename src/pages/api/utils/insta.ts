import type { NextApiRequest, NextApiResponse } from "next";
import puppeteer, { Browser } from "puppeteer";

let globalBrowser: Browser;

const getBrowser = async () => {
  try {
    if (globalBrowser) {
      return globalBrowser;
    }
    console.log("[api/utils/insta] Creating new Broswer");

    globalBrowser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreDefaultArgs: ["--disable-extensions"],
      headless: true,
      ignoreHTTPSErrors: true,
    });

    // Just open a new page in case we close all other pages
    void globalBrowser.newPage();

    return globalBrowser;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const username = req.query["username"];

  const browser = await getBrowser();

  if (!browser) {
    return res.status(500).json({
      message: "Something went wrong",
      hint: "BROSWER_INIT_FAILED",
    });
  }

  if (!username || Array.isArray(username)) {
    return res.status(400).json({
      message: `username must be a string. Got : "${typeof username}"`,
    });
  }

  const page = await browser.newPage();

  console.log("New Data");

  await page.goto(`https://instagram.com/${username}`, {
    waitUntil: "networkidle0",
  });

  const imageUrl = await page.evaluate(() => {
    let elements = document.getElementsByClassName("_aadp");
    if (elements.length === 0) {
      elements = document.getElementsByClassName("x6umtig");
    }
    const imageElement = elements[0];
    return imageElement?.getAttribute("src");
  });

  if (!imageUrl) {
    console.log(await page.content());
    const screenshot = await page.screenshot({ encoding: "base64" });
    void page.close();
    return res.status(500).json({
      message: "Something went wrong",
      hint: "IMAGE_TAG_NOT_FOUND",
      image: `data:image/png;base64,${screenshot}`,
    });
  }

  void page.close();

  return res.json({
    username,
    imageUrl,
  });
}
