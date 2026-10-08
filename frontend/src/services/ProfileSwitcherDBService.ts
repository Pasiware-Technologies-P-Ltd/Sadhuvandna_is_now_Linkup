import { getDBConnection } from './database';

export const ProfileSwitcherDBService = {
  saveProfiles: async (mainUserId: string, profiles: any[]) => {
    try {
      const db = await getDBConnection();
      
      // Clear old profiles for this user
      await db.runAsync(`DELETE FROM switcher_profiles WHERE main_user_id = ?`, [mainUserId]);
      
      // Insert new profiles
      for (const profile of profiles) {
        await db.runAsync(
          `INSERT INTO switcher_profiles (main_user_id, profile_id, name, photo, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            mainUserId, 
            String(profile.id), 
            profile.name || '', 
            profile.photo || '', 
            profile.type || 'Page'
          ]
        );
      }
    } catch (error) {
      console.error('Error saving switcher profiles:', error);
    }
  },

  getProfiles: async (mainUserId: string): Promise<any[]> => {
    try {
      const db = await getDBConnection();
      const result = await db.getAllAsync(`SELECT * FROM switcher_profiles WHERE main_user_id = ?`, [mainUserId]);
      
      if (result && result.length > 0) {
        return result.map((row: any) => ({
          id: row.profile_id,
          name: row.name,
          photo: row.photo,
          type: row.type
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting switcher profiles:', error);
      return [];
    }
  }
};
