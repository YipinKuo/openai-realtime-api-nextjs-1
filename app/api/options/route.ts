import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Initialize Airtable with the correct base ID
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appkeJEF0kUyLzfKJ');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const topicId = searchParams.get('topicId');

    if (type === 'categories') {
      const categories = await base('Categories').select({
        sort: [{ field: 'Order', direction: 'asc' }]
      }).all();
      return NextResponse.json({
        categories: categories.map(record => ({ id: record.id, ...record.fields }))
      });
    }

    if (type === 'topics' && categoryId) {
      // Filter topics by Category field matching categoryId
      const topics = await base('Topics').select({
        sort: [{ field: 'Order', direction: 'asc' }],
        filterByFormula: `FIND('${categoryId}', ARRAYJOIN({Category})) > 0`,
      }).all();
      return NextResponse.json({
        topics: topics.map(record => ({ id: record.id, ...record.fields }))
      });
    }

    if (type === 'topic' && topicId) {
      // Fetch a single topic by its id
      const record = await base('Topics').find(topicId).catch(() => null);
      if (!record) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }
      return NextResponse.json({ topic: { id: record.id, ...record.fields } });
    }

    // Fetch all data from each table with sorting to preserve Airtable order
    const categories = await base('Categories').select({
      sort: [{ field: 'Order', direction: 'asc' }]
    }).all();
    const topics = await base('Topics').select({
      sort: [{ field: 'Order', direction: 'asc' }]
    }).all();
    const subtopics = await base('Sub Topics').select({
      sort: [{ field: 'Order', direction: 'asc' }]
    }).all();

    // Return the raw data
    return NextResponse.json({
      categories: categories.map(record => ({ id: record.id, ...record.fields })),
      topics: topics.map(record => ({ id: record.id, ...record.fields })),
      subtopics: subtopics.map(record => ({ id: record.id, ...record.fields })),   });
  } catch (error) {
    console.error('Error fetching data from Airtable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options' },
      { status: 500 }
    );
  }
} 