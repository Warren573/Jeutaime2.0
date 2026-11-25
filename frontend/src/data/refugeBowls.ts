import type { RefugeAnimal } from './refugeAnimals';

export const BOWL_IMAGES = {
  empty: require('../../assets/images/refuge/bowls/bowl-empty.png'),
  food: require('../../assets/images/refuge/bowls/bowl-food.png'),
  meat: require('../../assets/images/refuge/bowls/bowl-meat.png'),
  fish: require('../../assets/images/refuge/bowls/bowl-fish.png'),
  salad: require('../../assets/images/refuge/bowls/bowl-salad.png'),
  carrot: require('../../assets/images/refuge/bowls/bowl-carrot.png'),
  bamboo: require('../../assets/images/refuge/bowls/bowl-bamboo.png'),
  seeds: require('../../assets/images/refuge/bowls/bowl-seeds.png'),
  sardines: require('../../assets/images/refuge/bowls/bowl-sardines.png'),
};
export type RefugeFood = Exclude<keyof typeof BOWL_IMAGES, 'empty'>;
export const FOOD_LABELS: Record<RefugeFood, string> = {
  food: 'Nourriture', meat: 'Viande', fish: 'Poisson', salad: 'Salade',
  carrot: 'Carottes', bamboo: 'Bambou', seeds: 'Graines', sardines: 'Sardines',
};
export const ANIMAL_FOODS: Record<RefugeAnimal, readonly RefugeFood[]> = {
  CHIEN: ['food','meat'], CHAT: ['food','fish','sardines'],
  LAPIN: ['salad','carrot'], HAMSTER: ['seeds','carrot'],
  TOUCAN: ['seeds'], RENARD: ['meat','fish'], MANCHOT: ['fish','sardines'],
  IGUANE: ['salad','carrot'], LICORNE: ['salad','carrot'],
  PERROQUET: ['seeds'], PANDA: ['bamboo'], DRAGON: ['meat','fish'],
};
