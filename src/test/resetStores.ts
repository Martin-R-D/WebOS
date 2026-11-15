import { useBookmarksStore } from "../stores/useBookmarksStore";
import { useExplorerSettingsStore } from "../stores/useExplorerSettingsStore";
import { useTodoStore } from "../stores/useTodoStore";
import { useConverterStore } from "../stores/useConverterStore";
import { useRecentFilesStore } from "../stores/useRecentFilesStore";
import { useNotesStore } from "../stores/useNotesStore";
import { useCalculatorHistoryStore } from "../stores/useCalculatorHistoryStore";
import { useFileSystemStore } from "../stores/useFileSystemStore";
import { useSystemStore } from "../stores/useSystemStore";
import { useWindowStore } from "../stores/useWindowStore";
import { useProfileStore } from "../stores/useProfileStore";
import { useCalendarStore } from "../stores/useCalendarStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useEditorSettingsStore } from "../stores/useEditorSettingsStore";

export function resetAllStores() {
  useBookmarksStore.setState(useBookmarksStore.getInitialState(), true);
  useExplorerSettingsStore.setState(
    useExplorerSettingsStore.getInitialState(),
    true,
  );
  useTodoStore.setState(useTodoStore.getInitialState(), true);
  useConverterStore.setState(useConverterStore.getInitialState(), true);
  useRecentFilesStore.setState(useRecentFilesStore.getInitialState(), true);
  useNotesStore.setState(useNotesStore.getInitialState(), true);
  useCalculatorHistoryStore.setState(
    useCalculatorHistoryStore.getInitialState(),
    true,
  );
  useFileSystemStore.setState(useFileSystemStore.getInitialState(), true);
  useSystemStore.setState(useSystemStore.getInitialState(), true);
  useWindowStore.setState(useWindowStore.getInitialState(), true);
  useProfileStore.setState(useProfileStore.getInitialState(), true);
  useCalendarStore.setState(useCalendarStore.getInitialState(), true);
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
  useEditorSettingsStore.setState(
    useEditorSettingsStore.getInitialState(),
    true,
  );
}
