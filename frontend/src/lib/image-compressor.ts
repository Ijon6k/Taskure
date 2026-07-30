/**
 * Client-side WebP image downscaling and compression helper.
 * Preserves 4K UHD resolution (max 3840px) at 85% WebP quality.
 */
export async function compressToWebP(
  file: File,
  maxDimension = 3840, // 4K UHD Max Dimension
  quality = 0.85
): Promise<File> {
  if (!file || !file.type.startsWith("image/")) {
    return file;
  }

  // Skip SVG or animated GIF to preserve vector / animation integrity
  if (file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        resolve(file);
        return;
      }

      // Calculate scale ratio up to 4K UHD (3840px)
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          const webpName = `${baseName}.webp`;
          const webpFile = new File([blob], webpName, {
            type: "image/webp",
            lastModified: Date.now(),
          });

          // Only use compressed file if it actually reduced the size
          if (webpFile.size < file.size) {
            resolve(webpFile);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
