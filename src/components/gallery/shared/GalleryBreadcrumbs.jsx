const GalleryBreadcrumbs = ({ category, album, onNavigate }) => {
  return (
    <div className="gallery-breadcrumbs">
      <button
        onClick={() => onNavigate('categories')}
        className="breadcrumb-link"
      >
        Galería
      </button>

      {category && (
        <>
          <span className="breadcrumb-separator">/</span>
          {!album ? (
            <span className="breadcrumb-current">{category.name}</span>
          ) : (
            <button
              onClick={() => onNavigate('albums', category)}
              className="breadcrumb-link"
            >
              {category.name}
            </button>
          )}
        </>
      )}

      {album && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{album.name}</span>
        </>
      )}
    </div>
  );
};

export default GalleryBreadcrumbs;
