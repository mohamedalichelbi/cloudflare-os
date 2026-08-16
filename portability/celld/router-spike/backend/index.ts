export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);

    return Response.json({
      component: "router-spike-backend",
      method: request.method,
      path: url.pathname,
    });
  },
};
