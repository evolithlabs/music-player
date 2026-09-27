import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import type { DatabaseSettings } from 'src/types/db';
import { getDbInstance } from 'src/db';
import { useQuasar } from 'quasar';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<DatabaseSettings>();
  const $q = useQuasar();

  const getSettings = async () => {
    if (settings.value) return settings.value;

    try {
      const db = await getDbInstance();
      settings.value = await db.selectFrom('settings').selectAll().executeTakeFirst();
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Oops - DB settings fetch error',
        caption: (error as Error).message,
      });
    }

    return settings.value;
  };

  const saveSettings = async (settingsData: Omit<DatabaseSettings, 'id'>) => {
    try {
      const db = await getDbInstance();
      const insertRow = await db.insertInto('settings').values(settingsData).executeTakeFirst();

      if (insertRow.insertId) {
        settings.value = await db
          .selectFrom('settings')
          .selectAll()
          .where('id', '=', Number(insertRow.insertId))
          .executeTakeFirst();
      }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Oops - DB settings fetch error',
        caption: (error as Error).message,
      });
    }

    return settings.value;
  };

  return { getSettings, saveSettings };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
