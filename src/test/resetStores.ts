import { useFileSystemStore } from "../stores/useFileSystemStore";
import { useSystemStore } from "../stores/useSystemStore";
import { useWindowStore } from "../stores/useWindowStore";
import { useProfileStore } from "../stores/useProfileStore";
import { useCalendarStore } from "../stores/useCalendarStore";

export function resetAllStores() {
  useFileSystemStore.setState(useFileSystemStore.getInitialState(), true);
  useSystemStore.setState(useSystemStore.getInitialState(), true);
  useWindowStore.setState(useWindowStore.getInitialState(), true);
  useProfileStore.setState(useProfileStore.getInitialState(), true);
  useCalendarStore.setState(useCalendarStore.getInitialState(), true);
}
