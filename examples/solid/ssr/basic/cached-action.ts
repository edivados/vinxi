import { defineCachedFunction } from "#internal/nitro/cache";

export const getCachedUserData = defineCachedFunction(async () => {
  const data: any = await $fetch(`https://dummyjson.com/user?limit=10&skip=5&select=key1,key2,key3`)
  return data;
}, {
  maxAge: 60 * 60,
  name: 'user-data',
  getKey: () => "user"
});