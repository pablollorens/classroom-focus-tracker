import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { lessonId } = await params;

  // Verify ownership
  const lesson = await prisma.preparedLesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson || lesson.teacherId !== (session.user as { id: string }).id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();
    const { exerciseIds } = body as { exerciseIds: string[] };

    if (!exerciseIds || !Array.isArray(exerciseIds)) {
      return new NextResponse("exerciseIds array required", { status: 400 });
    }

    // Update each exercise's orderIndex based on new position
    await prisma.$transaction(
      exerciseIds.map((id, index) =>
        prisma.exercise.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EXERCISES_REORDER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
