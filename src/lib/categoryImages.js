import conferenceImage from '../assets/events/conference.svg'
import workshopImage from '../assets/events/workshop.svg'
import networkingImage from '../assets/events/networking.svg'
import communityImage from '../assets/events/community.svg'
import artsImage from '../assets/events/arts.svg'
import technologyImage from '../assets/events/technology.svg'
import defaultImage from '../assets/events/default.svg'

const categoryImageMap = {
  conference: conferenceImage,
  business: conferenceImage,
  workshop: workshopImage,
  networking: networkingImage,
  community: communityImage,
  'arts & culture': artsImage,
  arts: artsImage,
  technology: technologyImage,
}

export const eventCategories = ['Technology', 'Business', 'Workshop', 'Networking', 'Arts & Culture', 'Community', 'Other']

export function getCategoryImage(category) {
  return categoryImageMap[String(category || '').trim().toLowerCase()] || defaultImage
}
