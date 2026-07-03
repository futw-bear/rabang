export function notFoundResponse(): Response {
  return Response.json(
    {
      error: "Not Found",
    },
    { status: 404 }
  );
}

export function upstreamErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected error";

  return Response.json(
    {
      error: message,
    },
    { status: 502 }
  );
}
