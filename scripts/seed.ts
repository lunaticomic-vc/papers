import { db } from "../lib/db";
import { topics } from "../lib/db/schema";
import { SEED_TOPICS } from "../lib/topics-seed";
import { eq } from "drizzle-orm";

async function seed() {
  let added = 0;
  for (const topic of SEED_TOPICS) {
    const existing = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.name, topic.name))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(topics).values({ ...topic, active: true });
    added++;
    console.log(`  + ${topic.name}`);
  }
  console.log(
    `\n${added > 0 ? "Seeded" : "Already up to date."} (${added} new / ${SEED_TOPICS.length} total)`,
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
