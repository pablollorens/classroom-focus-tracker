import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lessonId: string; exerciseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { lessonId, exerciseId } = await params;

  // Verify ownership
  const lesson = await prisma.preparedLesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson || lesson.teacherId !== (session.user as { id: string }).id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    // Verify exercise belongs to this lesson
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise || exercise.preparedLessonId !== lessonId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await prisma.exercise.delete({
      where: { id: exerciseId },
    });

    // Reorder remaining exercises
    const remainingExercises = await prisma.exercise.findMany({
      where: { preparedLessonId: lessonId },
      orderBy: { orderIndex: "asc" },
    });

    await prisma.$transaction(
      remainingExercises.map((ex, index) =>
        prisma.exercise.update({
          where: { id: ex.id },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EXERCISE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
