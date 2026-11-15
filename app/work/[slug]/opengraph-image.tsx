import { getProjectBySlug } from '@/services/projects.service';
import { OG_SIZE, renderOgCard } from '@/lib/og';

export const alt = 'Zaref case study';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  // Unknown/draft slug: the page itself 404s, so this only needs to be a safe branded card.
  if (!project) {
    return renderOgCard({ eyebrow: 'Case Study', title: 'Software built for real business.', footer: 'zaref.in/work' });
  }

  return renderOgCard({
    eyebrow: ['Case Study', project.category].filter(Boolean).join(' · '),
    title: project.title,
    description: project.shortDescription || project.description?.split('\n')[0],
    image: project.images?.[0],
    footer: 'zaref.in/work',
  });
}
