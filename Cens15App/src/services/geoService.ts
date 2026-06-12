export const getProvincias = async (): Promise<string[]> => {
  try {
    const response = await fetch(
      'https://apis.datos.gob.ar/georef/api/provincias'
    );

    const data = await response.json();

    // 👇 extraer solo nombres
    const provincias = data.provincias.map((p: any) => p.nombre);

    return provincias;
  } catch (error) {
    console.error('Error al obtener provincias:', error);
    throw error;
  }
};

export const getLocalidadesByProvincia = async (
  provinciaNombre: string
): Promise<string[]> => {
  try {
    const encoded = encodeURIComponent(provinciaNombre);
    const response = await fetch(
      `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encoded}&campos=nombre&max=5000`
    );

    const data = await response.json();
    const localidades: string[] = (data.localidades || []).map((l: any) => String(l.nombre));

    const unicasOrdenadas = Array.from(new Set(localidades)) as string[];
    unicasOrdenadas.sort((a, b) =>
      a.localeCompare(b)
    );

    return unicasOrdenadas;
  } catch (error) {
    console.error('Error al obtener localidades:', error);
    throw error;
  }
};
