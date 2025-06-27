export interface AnnouncementContent {
  enabled: boolean;
  title: string;
  message: string;
}

export const announcementContent: AnnouncementContent = {
  enabled: true, // Para desactivar el pop-up, cambia esto a false
  title: "¡MUCHAS GRACIAS, THANKS A LOT!",
  message: "¡Y se acabuche! Brujilda la gallinga completó su historia y está muy agradecida por su ayuda. ¡No te la pierdas, la publicaremos muy pronto! / And that's a wrap! Brujilda la gallinga has completed her story and is very grateful for your help. Don't miss it, we'll be publishing it very soon!"
};