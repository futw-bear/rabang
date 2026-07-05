export function notFoundResponse(): Response {
  return Response.json(
    {
      error: "Not Found",
    },
    { status: 404 }
  );
}

export function badRequestResponse(message: string): Response {
  return Response.json(
    {
      error: message,
    },
    { status: 400 }
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

export function serviceUnavailableResponse(message: string): Response {
  return Response.json(
    {
      error: message,
    },
    { status: 503 }
  );
}
