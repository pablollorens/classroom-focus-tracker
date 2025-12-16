import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function inferResourceType(url: string): string {
  if (!url) return 'TEXT';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
    return 'VIDEO';
  }
  if (lower.endsWith('.pdf')) {
    return 'PDF';
  }
  return 'URL';
}

async function main() {
  console.log('Starting migration of exercises to resources...');

  // Get all exercises with title and url that don't have a resourceId
  const exercises = await prisma.exercise.findMany({
    where: {
      resourceId: null,
      title: { not: null },
    },
    include: {
      preparedLesson: {
        select: { teacherId: true }
      }
    }
  });

  console.log(`Found ${exercises.length} exercises to migrate`);

  if (exercises.length === 0) {
    console.log('No exercises to migrate. Exiting.');
    return;
  }

  // Track created resources to avoid duplicates
  const resourceMap = new Map<string, string>(); // key: "teacherId-title-url" -> resourceId

  for (const exercise of exercises) {
    const key = `${exercise.preparedLesson.teacherId}-${exercise.title}-${exercise.url}`;

    let resourceId = resourceMap.get(key);

    if (!resourceId) {
      // Create new resource
      const resource = await prisma.resource.create({
        data: {
          title: exercise.title || 'Untitled',
          type: inferResourceType(exercise.url || ''),
          url: exercise.url,
          teacherId: exercise.preparedLesson.teacherId,
        }
      });
      resourceId = resource.id;
      resourceMap.set(key, resourceId);
      console.log(`Created resource: ${resource.title} (${resource.type})`);
    }

    // Update exercise with resourceId
    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { resourceId }
    });
  }

  console.log(`Migration complete. Created ${resourceMap.size} resources.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
