export interface AnnouncementContent {
  enabled: boolean;
  title: string;
  message: string;
}

export const announcementContent: AnnouncementContent = {
  enabled: true, // Para desactivar el pop-up, cambia esto a false
  title: "¡MUCHAS GRACIAS,<br> THANKS A LOT!",
  message: "¡Y se acabuche! Brujilda la gallina está muy agradecida por haberla ayudado a completar su historia. ¡No te la pierdas, la publicaremos muy pronto! / And that's a wrap! Brujilda la gallina is very grateful for your help in completing her story. Don't miss it, we'll be publishing it very soon!"
};