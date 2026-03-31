package com.dailystudy.backend.controller;

import com.dailystudy.backend.dto.RegistroUsuario;
import com.dailystudy.backend.model.Usuario;
import com.dailystudy.backend.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuario")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @PostMapping("/registro")
    public ResponseEntity<Usuario> registro(@RequestBody RegistroUsuario dto) {
        Usuario newUsuario = usuarioService.RegistroUsuario(dto);

        return ResponseEntity.ok(newUsuario);

    }
}
