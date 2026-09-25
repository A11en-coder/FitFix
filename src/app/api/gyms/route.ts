import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createGymForUser, GymAlreadyExistsError } from "../../../features/auth/onboarding-service";
import { parseGymOnboardingInput } from "../../../features/auth/onboarding-schema";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Create a request context for logging and tracing
  const requestContext = createRequestContext();

  // Authenticate the user
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
        requestId: requestContext.requestId,
      },
      { status: 401 },
    );

  try {
    // Parse the request body and validate the input
    const input = parseGymOnboardingInput(await request.json());
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          requestId: requestContext.requestId,
        },
        { status: 401 },
      );

    // Create the gym for the authenticated user
    const organizationClient = (await clerkClient()).organizations;
    const gym = await createGymForUser(
      input,
      {
        clerkUserId: userId,
        displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Gym owner",
        email: user.emailAddresses[0]?.emailAddress ?? "unknown@invalid.local",
      },
      organizationClient,
    );
    return NextResponse.json({ id: gym.id, name: gym.name, slug: gym.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please check the gym details.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    if (error instanceof GymAlreadyExistsError)
      return NextResponse.json(
        { code: "GYM_ALREADY_EXISTS", message: error.message, requestId: requestContext.requestId },
        { status: 409 },
      );
    console.error("Gym workspace creation failed", {
      requestId: requestContext.requestId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    });
    return NextResponse.json(
      {
        code: "GYM_CREATION_FAILED",
        message: "The gym could not be created.",
        requestId: requestContext.requestId,
      },
      { status: 500 },
    );
  }
}
