import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

interface BookmarksState {
  bookmarks: Bookmark[];
  save: (title: string, url: string, id?: string) => string | null;
  remove: (id: string) => void;
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      save: (title, rawUrl, id) => {
        const name = title.trim();
        if (!name || name.length > 80)
          return "Enter a name with 1–80 characters.";
        let url: URL;
        try {
          const raw = rawUrl.trim();
          url = new URL(
            /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`,
          );
          if (
            !["http:", "https:"].includes(url.protocol) ||
            !url.hostname ||
            url.username ||
            url.password ||
            url.href.length > 2048
          )
            throw new Error("Invalid address");
        } catch {
          return "Enter an HTTP or HTTPS website address without credentials.";
        }
        const { bookmarks } = get();
        if (id && !bookmarks.some((item) => item.id === id))
          return "This bookmark is no longer available.";
        if (bookmarks.some((item) => item.id !== id && item.url === url.href))
          return "This address is already bookmarked.";
        if (!id && bookmarks.length >= 50)
          return "You can save up to 50 bookmarks.";
        set({
          bookmarks: id
            ? bookmarks.map((item) =>
                item.id === id ? { ...item, title: name, url: url.href } : item,
              )
            : [
                ...bookmarks,
                { id: crypto.randomUUID(), title: name, url: url.href },
              ],
        });
        return null;
      },
      remove: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((item) => item.id !== id),
        })),
    }),
    { name: "webos-bookmarks", version: 1 },
  ),
);
