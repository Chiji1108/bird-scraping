import puppeteer from "puppeteer";
import fs from "fs/promises";

import birds from "./birds.json";
// const birds = [{ name: "カワラバト" }];

(async () => {
  const browser = await puppeteer.launch({ headless: true });

  const result = await Promise.all(
    birds.map(async ({ name }) => {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

      await page.goto(
        `https://www.birdfan.net/pg/kind-search/?species=${name}&habitat=&size=&color=&paged=0`,
        {
          waitUntil: "networkidle2",
        }
      );
      const [el] = await page.$x(
        `//*[@id="result-wrapper"]/p/a[text()="${name}"]`
      );
      if (el) {
        await Promise.all([
          el.click(),
          page.waitForNavigation({
            waitUntil: "networkidle2",
          }),
        ]);
      }
      const url = page.url();

      const [mainImages, subImages, audioIds] = await Promise.all([
        page.$$eval("div.sp-main-images.clearfix > div > img", (imgs) =>
          imgs.map((img) => `https://www.birdfan.net${img.getAttribute("src")}`)
        ),
        page.$$eval("img.attachment-thumbnail.size-thumbnail", (imgs) =>
          imgs.map(
            (img) =>
              `https://www.birdfan.net${img
                .getAttribute("original")
                ?.replace("-150x150", "")}`
          )
        ),
        page.$$eval("div.youtube > div > iframe", (iframes) =>
          iframes.map(
            (iframe) =>
              iframe
                .getAttribute("src")
                ?.split(/https:\/\/www\.youtube.com\/embed\/|\?/)[1]
          )
        ),
      ]);
      // console.log(subImages);
      await page.close();
      return {
        name,
        url,
        images: [...mainImages, ...subImages],
        audioIds,
      };
    })
  );
  await browser.close();

  // console.log(result);

  await fs.writeFile("./out/result.json", JSON.stringify(result));
})();
