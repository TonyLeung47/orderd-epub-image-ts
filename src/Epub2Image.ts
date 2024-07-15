import JSZip from "jszip";

const IMAGE_SUFFIX = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".avif"];

function reolvePath(basePath: string, relativePath: string) {
  if (basePath[0] !== "/") basePath = "/" + basePath;
  if (basePath[basePath.length - 1] !== "/") basePath += "/";
  const resolveUrl = new URL(relativePath, "https://analsex.com" + basePath);
  return resolveUrl.pathname.replace(/^\/+/, "");
}

async function getopfPath(zipFile: JSZip) {
  const xmlFile = zipFile.file("META-INF/container.xml");
  if (!xmlFile) {
    return null;
  }

  const parser = new DOMParser();
  const xmlText = await xmlFile.async("text");
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const rootfileElement = xmlDoc.querySelector("rootfile");
  const fullPath = rootfileElement?.getAttribute("full-path");
  return fullPath || null;
}

async function getItemPaths(opfPath: string, zipFile: JSZip) {
  const opfFile = zipFile.file(opfPath);
  if (!opfFile) {
    return null;
  }

  const parser = new DOMParser();
  const opfText = await opfFile.async("text");
  const opfDoc = parser.parseFromString(opfText, "application/xml");
  const itemElements = opfDoc.querySelectorAll("item");

  const items: { [key: string]: string } = {};
  itemElements.forEach((item) => {
    const id = item.getAttribute("id"),
      href = item.getAttribute("href");
    if (id && href) items[id] = href;
  });

  const itemRefs = Array.from(opfDoc.querySelectorAll("itemref"))
    .map((itemref) => itemref.getAttribute("idref"))
    .filter((idref): idref is string => idref !== null);

  const parentDir = opfPath.substring(0, opfPath.lastIndexOf("/"));
  return itemRefs.map((id) => reolvePath(parentDir, items[id]));
}

export async function epub2Image(epub: File) {
  try {
    const zip = new JSZip();
    const buffer = await epub.arrayBuffer();
    const zipFile = await zip.loadAsync(buffer);

    const opfPath = await getopfPath(zipFile);
    if (!opfPath) return null;

    const itemPaths = await getItemPaths(opfPath, zipFile);
    if (!itemPaths) return null;

    const imagePaths = [];
    for (const itemPath of itemPaths) {
      if (IMAGE_SUFFIX.some((suffix) => itemPath.endsWith(suffix))) {
        imagePaths.push(itemPath);
      } else if (itemPath.endsWith(".xhtml") || itemPath.endsWith(".html")) {
        const htmlFile = zipFile.file(itemPath);
        if (!htmlFile) continue;

        const htmlText = await htmlFile.async("text");
        const htmlDoc = new DOMParser().parseFromString(htmlText, "application/xml");
        const imgElements = htmlDoc.querySelector("img") || htmlDoc.querySelector("image");
        if (!imgElements) continue;

        const parentDir = itemPath.substring(0, itemPath.lastIndexOf("/"));
        const src = imgElements.getAttribute("xlink:href") || imgElements.getAttribute("src");
        if (!src) continue;
        imagePaths.push(reolvePath(parentDir, src));
      }
    }

    const imageZip = new JSZip();
    const used = new Set();
    let index = 1;
    for (const imagePath of imagePaths) {
      if (used.has(imagePath)) continue;
      used.add(imagePath);

      const imageFile = zipFile.file(imagePath);
      if (!imageFile) continue;

      const imageBuffer = await imageFile.async("arraybuffer");
      const imageName = String(index).padStart(5, "0") + imagePath.substring(imagePath.lastIndexOf("."));
      imageZip.file(imageName, imageBuffer);
      index++;
    }
    const imageZipBlob = await imageZip.generateAsync({ type: "blob" });
    const imageUrl = URL.createObjectURL(imageZipBlob);

    return imageUrl;
  } catch (error) {
    return null;
  }
}
