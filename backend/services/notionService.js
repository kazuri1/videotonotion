const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const databaseId = process.env.NOTION_DATABASE_ID;

async function saveToNotion(text, url) {
  if (!databaseId) {
    throw new Error('Notion Database ID is not configured.');
  }

  const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');

  // Notion has a 2000 character limit per text block. 
  // We split the transcript into multiple paragraph blocks.
  const chunks = [];
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push(text.slice(i, i + 2000));
  }

  const blocks = chunks.map(chunk => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: chunk,
          },
        },
      ],
    },
  }));

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      // We'll skip other properties for now to ensure the save works even if the database isn't fully set up.
      // The user can add 'Source URL' (URL type) and 'Created At' (Date type) to their database later.
    },
    children: blocks,
  });

  return response;
}

module.exports = { saveToNotion };
