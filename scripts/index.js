Hooks.once("ready", async function () {
  if (game.user.isGM) {
    console.log("Mein Einstellungen-Button | Initialisierung");

    if (ui.sidebar && ui.sidebar.tabs.settings) {
      const button = document.createElement("button");
      button.innerHTML = '<i class="fas fa-image"></i>Image Tools';
      button.classList.add("my-settings-button");

      button.addEventListener("click", () => {
        openImageTools();
      });

      const settingsTab = ui.sidebar.tabs.settings;
      const buttonContainer = settingsTab.element.find("#settings-game");
      if (buttonContainer.length) {
        buttonContainer.append(button);
      }
    }
  }
});

async function openImageTools() {
  const imageData = await scanForImages();
  const content = generateDialogContent(imageData);
  new Dialog({
    title: "Bildwerkzeuge",
    content: content,
    buttons: {
      close: {
        label: "Schließen",
        callback: () => console.log("Dialog geschlossen"),
      },
    },
    render: (html) => {
      html.find("#inner-button").click(() => {
        scanForImages();
      });

      html.find(".imagetools-image-preview").on("click", async (event) => {
        const imageUrl = $(event.currentTarget).data("url");
        await convertImage(imageUrl);
      });
    },
  }).render(true);
}

async function scanForImages() {
  const imageMap = {};

  for (const journal of game.journal) {
    for (const page of journal.pages) {
      if (page.type === "text") {
        const content = page.text.content;
        const imgRegex = /src="([^"]+\.(jpg|jpeg|png))"/gi;
        let match;
        while ((match = imgRegex.exec(content)) !== null) {
          const imageUrl = match[1];

          if (!imageMap[imageUrl]) {
            imageMap[imageUrl] = [];
          }
          imageMap[imageUrl].push({
            journalId: journal.id,
            journalName: journal.name,
            pageId: page.id,
            pageName: page.name,
          });
        }
      }
    }
  }

  // Ausgabe der Ergebnisse in der Konsole
  console.log(imageMap);

  return imageMap;
}

function generateDialogContent(imageData) {
  let content = `<div class="imagetools-image-list-container">`;

  for (const [imageUrl, pages] of Object.entries(imageData)) {
    content += `
      <div class="imagetools-image-item">
        <strong>${imageUrl}</strong>
        <img src="${imageUrl}" alt="Bildvorschau" class="imagetools-image-preview" data-url="${imageUrl}"/>
        <ul class="imagetools-page-list">
    `;

    pages.forEach((page) => {
      content += `<li><a class="content-link" draggable="true" data-link="" data-uuid="JournalEntry.${page.journalId}.JournalEntryPage.${page.pageId}" data-id="i0kDT2ep8JxzTw07" data-type="JournalEntryPage" data-tooltip="Text Seite" aria-describedby="tooltip"><i class=""></i>${page.journalName} - ${page.pageName}</a></li>`;
    });

    content += `
        </ul>
      </div>
    `;
  }

  content += `</div>`;
  return content;
}

async function convertImageToWebP(imageUrl) {
  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve) => {
    img.onload = () => resolve();
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const webpDataUrl = canvas.toDataURL("image/webp");
  const response = await fetch(webpDataUrl);
  const blob = await response.blob();
  const filePath = imageUrl.substring(0, imageUrl.lastIndexOf("."));

  const webpFilePath = `${filePath}.webp`;
  try {
    const urlParts = webpFilePath.split("/");
    const fileName = urlParts.pop();
    const targetPath = urlParts.join("/");

    const file = new File([blob], fileName, { type: blob.type });
    await FilePicker.upload("data", targetPath, file);
  } catch (error) {
    console.error(`Fehler beim Speichern des Bildes: ${error.message}`);
  }

  console.log(`Bild konvertiert und gespeichert als ${webpFilePath}`);
}

async function updateJournalReferences(originalImageUrl, newImageUrl) {
  for (const journal of game.journal) {
    for (const page of journal.pages) {
      if (page.type === "text") {
        try {
          const content = page.text.content;
          const updatedContent = content.replace(
            new RegExp(originalImageUrl, "g"),
            newImageUrl
          );
          if (updatedContent !== content) {
            await page.update({
              text: {
                content: updatedContent,
                format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
              },
            });
            console.log(
              `Verweis auf ${originalImageUrl} aktualisiert in ${page.name}`
            );
          }
        } catch (error) {}
      }
    }
  }
}

async function convertImage(imageUrl) {
  await convertImageToWebP(imageUrl);
  const webpImageUrl =
    imageUrl.substring(0, imageUrl.lastIndexOf(".")) + ".webp";
  await updateJournalReferences(imageUrl, webpImageUrl);
  ui.notifications.info(
    "Bild erfolgreich konvertiert und alle Verweise aktualisiert."
  );
}
async function saveImage(imageUrl, blob) {}
