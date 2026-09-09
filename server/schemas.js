import { z } from 'zod';

export const photoSchema = z.string().max(3_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/);
const amount = z.union([z.string().trim().regex(/^\d*(\.\d{1,2})?$/),z.number()]).transform(Number).pipe(z.number().finite().min(0).max(1_000_000));
export const productSchema = z.object({
  photo: photoSchema,
  name: z.string().trim().min(2).max(140),
  condition: z.enum(['new','good','fair','poor']),
  details: z.string().max(2000).default(''),
  goal: z.enum(['profit','quick','trade']),
  tradeInterest: z.string().max(200).default(''),
  location: z.string().trim().min(1).max(100),
  buy: z.union([z.literal(''),amount]),
  expenses: amount,
  fee: amount.pipe(z.number().max(99.9)),
});
export const identificationSchema = z.object({
  name: z.string(),
  note: z.string(),
  confidence: z.enum(['low','medium','high']),
});
export const analysisSchema = z.object({
  summary: z.string(),
  sellability: z.string(),
  comparables: z.array(z.object({
    title: z.string(), url: z.string(), price: z.number(), currency: z.enum(['EUR']),
    comparable: z.boolean(), condition: z.string(), priceType: z.enum(['asking']),
  })),
  trades: z.array(z.object({title:z.string(),url:z.string(),price:z.number(),reason:z.string()})),
  risks: z.array(z.string()),
});
export const outputFormat = (name,schema) => ({type:'json_schema',name,strict:true,schema:z.toJSONSchema(schema,{target:'draft-7'})});
