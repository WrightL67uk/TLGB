/** The short promo film shown above the plans on a sign-up page. */
export default function PromoVideo({ name, label }: { name: 'tlgb-trades' | 'tlgb-suppliers'; label: string }) {
  return (
    <figure className="promo-video">
      <video controls playsInline preload="none" poster={`/video/${name}.jpg`} aria-label={label}>
        <source src={`/video/${name}.mp4`} type="video/mp4" />
        Your browser cannot play this video. <a href={`/video/${name}.mp4`}>Download it here</a>.
      </video>
      <figcaption className="muted small">{label}</figcaption>
    </figure>
  );
}
