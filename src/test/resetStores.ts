import { useFileSystemStore } from "../stores/useFileSystemStore";
import { useSystemStore } from "../stores/useSystemStore";
import { useWindowStore } from "../stores/useWindowStore";
import { useProfileStore } from "../stores/useProfileStore";
import { useCalendarStore } from "../stores/useCalendarStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useEditorSettingsStore } from "../stores/useEditorSettingsStore";

export function resetAllStores() {
  useFileSystemStore.setState(useFileSystemStore.getInitialState(), true);
  useSystemStore.setState(useSystemStore.getInitialState(), true);
  useWindowStore.setState(useWindowStore.getInitialState(), true);
  useProfileStore.setState(useProfileStore.getInitialState(), true);
  useCalendarStore.setState(useCalendarStore.getInitialState(), true);
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
  useEditorSettingsStore.setState(useEditorSettingsStore.getInitialState(), true);
}
