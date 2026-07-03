export function hasBearerToken(req: Request, token: string): boolean {
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export function unauthorizedResponse(): Response {
  return Response.json(
    {
      error: "Unauthorized",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="rabang"',
      },
    }
  );
}
