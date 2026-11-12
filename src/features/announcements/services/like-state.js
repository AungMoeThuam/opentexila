// The like button changes the count at once and undoes it if the request
// fails. These helpers hold that logic so it can be tested without a page.

// The state shown straight after a click. The count never goes below 0.
export function optimisticLike(state) {
  const liked = !state.liked;
  return {
    liked,
    like_count: Math.max(0, state.like_count + (liked ? 1 : -1)),
  };
}

// The final state is what the server answered, so the count is exact even
// when other people liked in the meantime.
export function settleLike(state, response) {
  return { liked: response.liked, like_count: response.like_count };
}
